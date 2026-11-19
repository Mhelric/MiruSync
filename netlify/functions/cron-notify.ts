import type { Config } from '@netlify/functions';
import webpush from 'web-push';
import { getPushDiagnostics, sendFcmNotification } from './_lib/push';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

const RECENT_AIRED_QUERY = `
  query ($start: Int!, $end: Int!) {
    Page(page: 1, perPage: 50) {
      airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
        episode
        airingAt
        media {
          id
          idMal
          title { romaji english }
          isAdult
        }
      }
    }
  }
`;

export const config: Config = {
  schedule: '@hourly',
};

interface FollowedTitleRow {
  id: string;
  user_id: string;
  media_id: string;
  media_type: 'ANIME' | 'MANGA';
  al_id?: number | null;
  mal_id?: number | null;
  title: string;
  last_notified_ep?: number | null;
  last_notified_chapter?: string | null;
}

interface LatestChapterInfo {
  chapter: string;
  title: string;
  publishedAt: string;
}

async function fetchLatestMangaDexChapter(
  title: string
): Promise<LatestChapterInfo | null> {
  try {
    const searchRes = await fetch(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=1&contentRating[]=safe&contentRating[]=suggestive`,
      { headers: { 'User-Agent': 'MiruSync/1.0' } }
    );
    if (!searchRes.ok) return null;
    const searchJson = (await searchRes.json()) as {
      data?: Array<{ id: string }>;
    };
    const mangaId = searchJson.data?.[0]?.id;
    if (!mangaId) return null;

    const chRes = await fetch(
      `https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&order[publishAt]=desc&limit=1&contentRating[]=safe&contentRating[]=suggestive`,
      { headers: { 'User-Agent': 'MiruSync/1.0' } }
    );
    if (!chRes.ok) return null;
    const chJson = (await chRes.json()) as {
      data?: Array<{
        attributes: {
          chapter?: string | null;
          title?: string | null;
          publishAt: string;
        };
      }>;
    };
    const latest = chJson.data?.[0];
    if (!latest?.attributes.chapter) return null;
    return {
      chapter: latest.attributes.chapter,
      title: latest.attributes.title ?? '',
      publishedAt: latest.attributes.publishAt,
    };
  } catch {
    return null;
  }
}

function isNewerChapter(latest: string, previous: string | null | undefined): boolean {
  if (!previous) return true;
  if (latest === previous) return false;
  const latestNum = Number.parseFloat(latest);
  const prevNum = Number.parseFloat(previous);
  if (!Number.isNaN(latestNum) && !Number.isNaN(prevNum)) {
    return latestNum > prevNum;
  }
  return latest !== previous;
}

export default async function handler(req?: Request): Promise<Response> {
  const url = req ? new URL(req.url) : null;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url?.searchParams.get('verify') === '1') {
    const push = getPushDiagnostics();
    return Response.json({
      ok: true,
      supabaseConfigured: Boolean(supabaseUrl && serviceKey),
      ...push,
      timestamp: new Date().toISOString(),
    });
  }

  if (!supabaseUrl || !serviceKey) {
    return Response.json({ ok: false, error: 'Supabase not configured' }, { status: 500 });
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  const notificationsToInsert: Array<{
    user_id: string;
    type: 'episode' | 'chapter';
    title: string;
    body: string;
    media_id: string;
  }> = [];

  // 1. Check recently aired Anime episodes
  const nowSec = Math.floor(Date.now() / 1000);
  const oneHourAgo = nowSec - 3600;

  try {
    const gqlRes = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: RECENT_AIRED_QUERY,
        variables: { start: oneHourAgo, end: nowSec },
      }),
    });

    if (gqlRes.ok) {
      const gqlJson = (await gqlRes.json()) as {
        data?: {
          Page?: {
            airingSchedules?: Array<{
              episode: number;
              media: {
                id: number;
                idMal?: number | null;
                isAdult?: boolean;
              };
            }>;
          };
        };
      };

      const aired = (gqlJson.data?.Page?.airingSchedules ?? []).filter(
        (a) => !a.media.isAdult
      );

      if (aired.length > 0) {
        const followedAnimeRes = await fetch(
          `${supabaseUrl}/rest/v1/followed_titles?media_type=eq.ANIME&select=*`,
          { headers }
        );
        if (followedAnimeRes.ok) {
          const followedAnime = (await followedAnimeRes.json()) as FollowedTitleRow[];
          for (const sub of followedAnime) {
            const match = aired.find(
              (a) =>
                (sub.al_id && a.media.id === sub.al_id) ||
                (sub.mal_id && a.media.idMal === sub.mal_id)
            );
            if (!match) continue;
            if ((sub.last_notified_ep ?? 0) >= match.episode) continue;

            notificationsToInsert.push({
              user_id: sub.user_id,
              type: 'episode',
              title: `Episode ${match.episode} aired!`,
              body: `${sub.title} — Episode ${match.episode} is now out.`,
              media_id: sub.media_id,
            });

            await fetch(`${supabaseUrl}/rest/v1/followed_titles?id=eq.${sub.id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ last_notified_ep: match.episode }),
            });
          }
        }
      }
    }
  } catch {
    // Continue to manga checks even if anime check fails
  }

  // 2. Check followed Manga titles against MangaDex
  let mangaChecked = 0;
  try {
    const followedMangaRes = await fetch(
      `${supabaseUrl}/rest/v1/followed_titles?media_type=eq.MANGA&select=*`,
      { headers }
    );
    if (followedMangaRes.ok) {
      const followedManga = (await followedMangaRes.json()) as FollowedTitleRow[];
      const chapterCache = new Map<string, LatestChapterInfo | null>();

      for (const sub of followedManga) {
        const key = sub.title.trim().toLowerCase();
        if (!chapterCache.has(key)) {
          chapterCache.set(key, await fetchLatestMangaDexChapter(sub.title));
          mangaChecked++;
        }
        const latest = chapterCache.get(key);
        if (!latest) continue;
        if (!isNewerChapter(latest.chapter, sub.last_notified_chapter)) continue;

        const chLabel = latest.title
          ? `Ch. ${latest.chapter}: ${latest.title}`
          : `Chapter ${latest.chapter}`;
        notificationsToInsert.push({
          user_id: sub.user_id,
          type: 'chapter',
          title: `New chapter: ${sub.title}`,
          body: `${chLabel} is now available on MangaDex.`,
          media_id: sub.media_id,
        });

        await fetch(`${supabaseUrl}/rest/v1/followed_titles?id=eq.${sub.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ last_notified_chapter: latest.chapter }),
        });
      }
    }
  } catch {
    // Ignore transient MangaDex errors
  }

  // 3. Insert notifications & dispatch FCM + Web Push notifications
  let fcmSent = 0;
  let webPushSent = 0;
  if (notificationsToInsert.length > 0) {
    await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers,
      body: JSON.stringify(notificationsToInsert),
    });

    const pushDiag = getPushDiagnostics();
    if (pushDiag.fcmConfigured || pushDiag.vapidConfigured) {
      const userIds = Array.from(new Set(notificationsToInsert.map((n) => n.user_id)));
      const inList = userIds.map((u) => `"${u}"`).join(',');

      const [subsRes, settingsRes] = await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?user_id=in.(${encodeURIComponent(inList)})&select=*`,
          { headers }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/user_settings?user_id=in.(${encodeURIComponent(inList)})&select=user_id,notifications_enabled`,
          { headers }
        ),
      ]);

      const allSubs = subsRes.ok
        ? ((await subsRes.json()) as Array<{
            user_id: string;
            platform: 'android' | 'web';
            token_or_subscription:
              | { token?: string; endpoint?: string; keys?: { p256dh: string; auth: string } }
              | string;
          }>)
        : [];
      const userSettings = settingsRes.ok
        ? ((await settingsRes.json()) as Array<{
            user_id: string;
            notifications_enabled?: boolean;
          }>)
        : [];

      const disabledUsers = new Set(
        userSettings
          .filter((s) => s.notifications_enabled === false)
          .map((s) => s.user_id)
      );

      if (pushDiag.vapidConfigured) {
        webpush.setVapidDetails(
          'mailto:notifications@mirusync.app',
          process.env.VAPID_PUBLIC_KEY!.trim(),
          process.env.VAPID_PRIVATE_KEY!.trim()
        );
      }

      for (const notif of notificationsToInsert) {
        if (disabledUsers.has(notif.user_id)) continue;
        const userSubs = allSubs.filter((s) => s.user_id === notif.user_id);

        for (const sub of userSubs) {
          if (sub.platform === 'android' && pushDiag.fcmConfigured) {
            const token =
              typeof sub.token_or_subscription === 'string'
                ? sub.token_or_subscription
                : sub.token_or_subscription?.token;
            if (!token) continue;
            const result = await sendFcmNotification({
              deviceToken: token,
              title: notif.title,
              body: notif.body,
              data: {
                media_id: notif.media_id,
                type: notif.type,
              },
            });
            if (result.ok) fcmSent++;
          } else if (
            sub.platform === 'web' &&
            pushDiag.vapidConfigured &&
            typeof sub.token_or_subscription === 'object' &&
            sub.token_or_subscription?.endpoint
          ) {
            try {
              await webpush.sendNotification(
                sub.token_or_subscription as webpush.PushSubscription,
                JSON.stringify({
                  title: notif.title,
                  body: notif.body,
                  url: `/media/${notif.type === 'chapter' ? 'manga' : 'anime'}/${encodeURIComponent(notif.media_id)}`,
                })
              );
              webPushSent++;
            } catch {
              // Ignore expired/unsubscribed browser endpoints
            }
          }
        }
      }
    }
  }

  return Response.json({
    ok: true,
    notificationsCreated: notificationsToInsert.length,
    mangaChecked,
    fcmSent,
    webPushSent,
    ...getPushDiagnostics(),
  });
}
