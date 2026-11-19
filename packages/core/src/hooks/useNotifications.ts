import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resolveApiBase } from '../apiBase';
import { useAuthStore } from '../auth/store';
import type { Media } from '../providers/types';
import { getSupabaseClient } from '../supabase/client';

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'episode' | 'chapter' | 'premiere' | 'news';
  title: string;
  body: string;
  media_id?: string | null;
  read: boolean;
  created_at: string;
}

function buildSyncHeaders(supabaseJwt?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (supabaseJwt) {
    headers.Authorization = `Bearer ${supabaseJwt}`;
  }
  return headers;
}

export function useNotifications(
  supabaseUrl = '',
  supabaseAnonKey = '',
  apiBase = ''
) {
  const session = useAuthStore((s) => s.session);
  const resolvedApiBase = resolveApiBase(apiBase);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const res = await fetch(`${resolvedApiBase}/api/user-sync`, {
          credentials: 'include',
          headers: buildSyncHeaders(session?.supabaseJwt),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { notifications?: AppNotification[] };
        if (!cancelled) {
          setItems(json.notifications ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    const client =
      session.supabaseJwt && supabaseUrl && supabaseAnonKey
        ? getSupabaseClient(supabaseUrl, supabaseAnonKey, session.supabaseJwt)
        : null;

    let channel: ReturnType<NonNullable<typeof client>['channel']> | undefined;
    if (client) {
      try {
        const suffix = Math.random().toString(36).slice(2, 9);
        channel = client
          .channel(`notifications:${session.user.id}:${suffix}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${session.user.id}`,
            },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const next = payload.new as AppNotification;
                setItems((prev) => [next, ...prev]);
              } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new as AppNotification;
                setItems((prev) =>
                  prev.map((item) => (item.id === updated.id ? updated : item))
                );
              }
            }
          )
          .subscribe();
      } catch {
        // Realtime is optional; /api/user-sync still handles reads/writes
      }
    }

    return () => {
      cancelled = true;
      if (client && channel) {
        void client.removeChannel(channel);
      }
    };
  }, [session?.user.id, session?.supabaseJwt, supabaseUrl, supabaseAnonKey, apiBase]);

  const markAsRead = useCallback(
    async (id: string) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      if (!session?.user.id) return;
      await fetch(`${resolvedApiBase}/api/user-sync`, {
        method: 'PATCH',
        credentials: 'include',
        headers: buildSyncHeaders(session.supabaseJwt),
        body: JSON.stringify({ markNotificationReadId: id }),
      });
    },
    [session?.user.id, session?.supabaseJwt, apiBase]
  );

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    if (!session?.user.id) return;
    await fetch(`${resolvedApiBase}/api/user-sync`, {
      method: 'PATCH',
      credentials: 'include',
      headers: buildSyncHeaders(session.supabaseJwt),
      body: JSON.stringify({ markAllNotificationsRead: true }),
    });
  }, [session?.user.id, session?.supabaseJwt, resolvedApiBase]);

  const unreadCount = items.filter((i) => !i.read).length;

  return { items, unreadCount, loading, markAsRead, markAllRead };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function registerWebPush(
  supabaseUrl: string,
  supabaseAnonKey: string,
  supabaseJwt: string,
  userId: string,
  vapidPublicKey: string
): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !vapidPublicKey
  ) {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const reg = await navigator.serviceWorker.register('/sw.js');
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const syncRes = await fetch(`${resolveApiBase()}/api/user-sync`, {
    method: 'PATCH',
    credentials: 'include',
    headers: buildSyncHeaders(supabaseJwt),
    body: JSON.stringify({ pushSubscription: subscription.toJSON() }),
  });

  if (syncRes.ok) return true;

  const client = getSupabaseClient(supabaseUrl, supabaseAnonKey, supabaseJwt);
  if (!client) return false;

  await client.from('push_subscriptions').upsert({
    user_id: userId,
    platform: 'web',
    token_or_subscription: subscription.toJSON(),
    updated_at: new Date().toISOString(),
  });

  return true;
}

export interface FollowedTitle {
  id?: string;
  user_id?: string;
  media_id: string;
  media_type: 'ANIME' | 'MANGA';
  al_id?: number | null;
  mal_id?: number | null;
  title: string;
  last_notified_ep?: number | null;
  last_notified_chapter?: string | null;
}

export function useFollowedTitles(apiBase = '') {
  const session = useAuthStore((s) => s.session);
  const resolvedApiBase = resolveApiBase(apiBase);
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? '';

  const query = useQuery<FollowedTitle[]>({
    queryKey: ['followedTitles', userId],
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const res = await fetch(`${resolvedApiBase}/api/user-sync`, {
        credentials: 'include',
        headers: buildSyncHeaders(session?.supabaseJwt),
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { followedTitles?: FollowedTitle[] };
      return json.followedTitles ?? [];
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async ({
      media,
      currentlyFollowing,
      latestChapter,
    }: {
      media: Media;
      currentlyFollowing: boolean;
      latestChapter?: string | null;
    }) => {
      if (!userId) return;
      const body = currentlyFollowing
        ? { unfollowMediaId: media.id }
        : {
            followTitle: {
              media_id: media.id,
              media_type: media.type,
              al_id: media.alId ?? null,
              mal_id: media.malId ?? null,
              title: media.title.english || media.title.romaji || media.title.native || 'Untitled',
              last_notified_ep: media.nextAiring?.episode ? Math.max(0, media.nextAiring.episode - 1) : 0,
              last_notified_chapter: latestChapter ?? null,
            },
          };

      const res = await fetch(`${resolvedApiBase}/api/user-sync`, {
        method: 'PATCH',
        credentials: 'include',
        headers: buildSyncHeaders(session?.supabaseJwt),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error('Failed to update release alerts');
      }
    },
    onMutate: async ({ media, currentlyFollowing }) => {
      await queryClient.cancelQueries({ queryKey: ['followedTitles', userId] });
      const previous = queryClient.getQueryData<FollowedTitle[]>(['followedTitles', userId]) ?? [];
      if (currentlyFollowing) {
        queryClient.setQueryData<FollowedTitle[]>(
          ['followedTitles', userId],
          previous.filter((f) => f.media_id !== media.id)
        );
      } else {
        queryClient.setQueryData<FollowedTitle[]>(
          ['followedTitles', userId],
          [
            {
              media_id: media.id,
              media_type: media.type,
              al_id: media.alId ?? null,
              mal_id: media.malId ?? null,
              title: media.title.english || media.title.romaji || 'Untitled',
            },
            ...previous,
          ]
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['followedTitles', userId], ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['followedTitles', userId] });
    },
  });

  const followedSet = new Set((query.data ?? []).map((f) => f.media_id));

  return {
    followedTitles: query.data ?? [],
    isFollowing: (mediaId?: string) => Boolean(mediaId && followedSet.has(mediaId)),
    toggleFollow,
    isLoading: query.isLoading,
  };
}

export interface MangaDexChapter {
  id: string;
  chapter: string;
  title: string;
  publishedAt: string;
  url: string;
}

export function useMangaDexChapters(
  title: string | undefined,
  enabled: boolean,
  apiBase = ''
) {
  const resolvedApiBase = resolveApiBase(apiBase);
  return useQuery<{ mangaId?: string; chapters: MangaDexChapter[] }>({
    queryKey: ['mangadexChapters', title],
    enabled: Boolean(enabled && title),
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      if (!title) return { chapters: [] };
      const res = await fetch(
        `${resolvedApiBase}/api/mangadex-chapters?title=${encodeURIComponent(title)}`
      );
      if (!res.ok) return { chapters: [] };
      return (await res.json()) as { mangaId?: string; chapters: MangaDexChapter[] };
    },
  });
}
