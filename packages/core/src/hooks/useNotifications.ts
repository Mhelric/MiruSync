import { useCallback, useEffect, useState } from 'react';
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

export function useNotifications(supabaseUrl = '', supabaseAnonKey = '') {
  const session = useAuthStore((s) => s.session);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user.id || !session.supabaseJwt || !supabaseUrl || !supabaseAnonKey) {
      return;
    }

    const client = getSupabaseClient(supabaseUrl, supabaseAnonKey, session.supabaseJwt);
    if (!client) return;

    let cancelled = false;
    setLoading(true);

    async function load() {
      const { data } = await client!
        .from('notifications')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(40);

      if (!cancelled) {
        setItems((data as AppNotification[]) ?? []);
        setLoading(false);
      }
    }

    void load();

    const channel = client
      .channel(`notifications:${session.user.id}`)
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

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [session?.user.id, session?.supabaseJwt, supabaseUrl, supabaseAnonKey]);

  const markAsRead = useCallback(
    async (id: string) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      if (!session?.supabaseJwt || !supabaseUrl || !supabaseAnonKey) return;
      const client = getSupabaseClient(supabaseUrl, supabaseAnonKey, session.supabaseJwt);
      await client?.from('notifications').update({ read: true }).eq('id', id);
    },
    [session?.supabaseJwt, supabaseUrl, supabaseAnonKey]
  );

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    if (!session?.user.id || !session.supabaseJwt || !supabaseUrl || !supabaseAnonKey) {
      return;
    }
    const client = getSupabaseClient(supabaseUrl, supabaseAnonKey, session.supabaseJwt);
    await client
      ?.from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false);
  }, [session?.user.id, session?.supabaseJwt, supabaseUrl, supabaseAnonKey]);

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
