import type { Context } from '@netlify/functions';
import {
  resolveAuthenticatedUserId,
  supabaseServiceFetch,
} from './_lib/supabase';

interface FollowTitlePayload {
  media_id: string;
  media_type: 'ANIME' | 'MANGA';
  al_id?: number | null;
  mal_id?: number | null;
  title: string;
  last_notified_ep?: number | null;
  last_notified_chapter?: string | null;
}

interface SyncPatchBody {
  settings?: Record<string, unknown>;
  markNotificationReadId?: string;
  markAllNotificationsRead?: boolean;
  pushSubscription?: unknown;
  pushPlatform?: 'android' | 'web';
  followTitle?: FollowTitlePayload;
  unfollowMediaId?: string;
}

export default async function handler(req: Request, _context: Context) {
  const userId = resolveAuthenticatedUserId(req);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (req.method === 'GET') {
    const encodedUserId = encodeURIComponent(userId);
    const [settingsRes, notificationsRes, followedRes] = await Promise.all([
      supabaseServiceFetch(`user_settings?user_id=eq.${encodedUserId}&select=*&limit=1`),
      supabaseServiceFetch(
        `notifications?user_id=eq.${encodedUserId}&select=*&order=created_at.desc&limit=40`
      ),
      supabaseServiceFetch(
        `followed_titles?user_id=eq.${encodedUserId}&select=*&order=created_at.desc`
      ),
    ]);

    if (!settingsRes || !notificationsRes) {
      return Response.json({ settings: null, notifications: [], followedTitles: [] });
    }

    const settingsRows = settingsRes.ok ? ((await settingsRes.json()) as unknown[]) : [];
    const notifications = notificationsRes.ok
      ? ((await notificationsRes.json()) as unknown[])
      : [];
    const followedTitles =
      followedRes && followedRes.ok ? ((await followedRes.json()) as unknown[]) : [];

    return Response.json({
      settings: settingsRows[0] ?? null,
      notifications,
      followedTitles,
    });
  }

  if (req.method === 'PATCH') {
    let body: SyncPatchBody = {};
    try {
      body = (await req.json()) as SyncPatchBody;
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (body.settings && Object.keys(body.settings).length > 0) {
      const payload = {
        ...body.settings,
        user_id: userId,
        updated_at: new Date().toISOString(),
      };
      let res = await supabaseServiceFetch('user_settings?on_conflict=user_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(payload),
      });
      if (res && !res.ok) {
        res = await supabaseServiceFetch(
          `user_settings?user_id=eq.${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        );
      }
      if (res && !res.ok) {
        return Response.json({ error: 'Failed to update settings' }, { status: 500 });
      }
    }

    if (body.markNotificationReadId) {
      const res = await supabaseServiceFetch(
        `notifications?id=eq.${encodeURIComponent(body.markNotificationReadId)}&user_id=eq.${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ read: true }),
        }
      );
      if (res && !res.ok) {
        return Response.json({ error: 'Failed to mark notification read' }, { status: 500 });
      }
    }

    if (body.markAllNotificationsRead) {
      const res = await supabaseServiceFetch(
        `notifications?user_id=eq.${encodeURIComponent(userId)}&read=eq.false`,
        {
          method: 'PATCH',
          body: JSON.stringify({ read: true }),
        }
      );
      if (res && !res.ok) {
        return Response.json({ error: 'Failed to mark notifications read' }, { status: 500 });
      }
    }

    if (body.pushSubscription) {
      const platform = body.pushPlatform === 'android' ? 'android' : 'web';
      const res = await supabaseServiceFetch('push_subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          platform,
          token_or_subscription: body.pushSubscription,
          updated_at: new Date().toISOString(),
        }),
      });
      if (res && !res.ok) {
        return Response.json({ error: 'Failed to save push subscription' }, { status: 500 });
      }
    }

    if (body.followTitle) {
      const res = await supabaseServiceFetch(
        'followed_titles?on_conflict=user_id,media_id',
        {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            user_id: userId,
            media_id: body.followTitle.media_id,
            media_type: body.followTitle.media_type,
            al_id: body.followTitle.al_id ?? null,
            mal_id: body.followTitle.mal_id ?? null,
            title: body.followTitle.title,
            last_notified_ep: body.followTitle.last_notified_ep ?? 0,
            last_notified_chapter: body.followTitle.last_notified_chapter ?? null,
          }),
        }
      );
      if (res && !res.ok) {
        return Response.json({ error: 'Failed to follow title' }, { status: 500 });
      }
    }

    if (body.unfollowMediaId) {
      const res = await supabaseServiceFetch(
        `followed_titles?user_id=eq.${encodeURIComponent(userId)}&media_id=eq.${encodeURIComponent(body.unfollowMediaId)}`,
        { method: 'DELETE' }
      );
      if (res && !res.ok) {
        return Response.json({ error: 'Failed to unfollow title' }, { status: 500 });
      }
    }

    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
