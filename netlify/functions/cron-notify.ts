import type { Config } from '@netlify/functions';

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

export default async function handler() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const oneHourAgo = nowSec - 3600;

  const gqlRes = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: RECENT_AIRED_QUERY,
      variables: { start: oneHourAgo, end: nowSec },
    }),
  });

  if (!gqlRes.ok) return;

  const gqlJson = (await gqlRes.json()) as {
    data?: {
      Page?: {
        airingSchedules?: Array<{
          episode: number;
          media: {
            id: number;
            idMal?: number | null;
            title?: { romaji?: string; english?: string };
            isAdult?: boolean;
          };
        }>;
      };
    };
  };

  const aired = (gqlJson.data?.Page?.airingSchedules ?? []).filter(
    (a) => !a.media.isAdult
  );
  if (aired.length === 0) return;

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  const followedRes = await fetch(
    `${supabaseUrl}/rest/v1/followed_titles?media_type=eq.ANIME&select=*`,
    { headers }
  );
  if (!followedRes.ok) return;

  const followed = (await followedRes.json()) as Array<{
    id: string;
    user_id: string;
    media_id: string;
    al_id?: number | null;
    mal_id?: number | null;
    title: string;
    last_notified_ep?: number | null;
  }>;

  const notificationsToInsert: Array<Record<string, unknown>> = [];

  for (const sub of followed) {
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

  if (notificationsToInsert.length > 0) {
    await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers,
      body: JSON.stringify(notificationsToInsert),
    });
  }
}
