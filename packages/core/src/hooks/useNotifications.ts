import { useCallback, useEffect, useState } from 'react';
import { resolveApiBase } from '../apiBase';
import { useAuthStore } from '../auth/store';
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
    await fetch(`${apiBase}/api/user-sync`, {
      method: 'PATCH',
      credentials: 'include',
      headers: buildSyncHeaders(session.supabaseJwt),
      body: JSON.stringify({ markAllNotificationsRead: true }),
    });
  }, [session?.user.id, session?.supabaseJwt, apiBase]);

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
