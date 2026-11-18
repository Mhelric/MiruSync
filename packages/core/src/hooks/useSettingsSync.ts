import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { useAuthStore } from '../auth/store';
import { getSupabaseClient } from '../supabase/client';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  accent_color: string;
  title_language: 'romaji' | 'english' | 'native';
  list_layout: 'grid' | 'list' | 'compact';
  compact_mode: boolean;
  show_adult: boolean;
  spoiler_blur: boolean;
  notifications_enabled: boolean;
  quiet_hours: { start: string; end: string } | null;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  accent_color: 'sky',
  title_language: 'romaji',
  list_layout: 'grid',
  compact_mode: false,
  show_adult: false,
  spoiler_blur: true,
  notifications_enabled: true,
  quiet_hours: null,
};

interface SettingsStore {
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
  patchSettings: (partial: Partial<UserSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),
  patchSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),
}));

function buildSyncHeaders(supabaseJwt?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (supabaseJwt) {
    headers.Authorization = `Bearer ${supabaseJwt}`;
  }
  return headers;
}

export function useSettingsSync(
  supabaseUrl = '',
  supabaseAnonKey = '',
  apiBase = ''
) {
  const session = useAuthStore((s) => s.session);
  const settings = useSettingsStore((s) => s.settings);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const patchSettings = useSettingsStore((s) => s.patchSettings);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${apiBase}/api/user-sync`, {
          credentials: 'include',
          headers: buildSyncHeaders(session?.supabaseJwt),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { settings?: Partial<UserSettings> | null };
        const data = json.settings;
        if (!cancelled && data) {
          setSettings({
            theme: data.theme ?? DEFAULT_SETTINGS.theme,
            accent_color: data.accent_color ?? DEFAULT_SETTINGS.accent_color,
            title_language: data.title_language ?? DEFAULT_SETTINGS.title_language,
            list_layout: data.list_layout ?? DEFAULT_SETTINGS.list_layout,
            compact_mode: Boolean(data.compact_mode),
            show_adult: Boolean(data.show_adult),
            spoiler_blur: data.spoiler_blur ?? true,
            notifications_enabled: data.notifications_enabled ?? true,
            quiet_hours: data.quiet_hours ?? null,
          });
        }
      } catch {
        // Keep local defaults if offline
      }
    }

    void load();

    const client =
      session.supabaseJwt && supabaseUrl && supabaseAnonKey
        ? getSupabaseClient(supabaseUrl, supabaseAnonKey, session.supabaseJwt)
        : null;

    const channel = client
      ?.channel(`settings:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const row = payload.new as Partial<UserSettings> | undefined;
          if (row) {
            patchSettings(row);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (client && channel) {
        void client.removeChannel(channel);
      }
    };
  }, [
    session?.user.id,
    session?.supabaseJwt,
    supabaseUrl,
    supabaseAnonKey,
    apiBase,
    setSettings,
    patchSettings,
  ]);

  const updateSettings = useCallback(
    async (partial: Partial<UserSettings>) => {
      patchSettings(partial);
      if (!session?.user.id) return;

      setSyncing(true);
      try {
        await fetch(`${apiBase}/api/user-sync`, {
          method: 'PATCH',
          credentials: 'include',
          headers: buildSyncHeaders(session.supabaseJwt),
          body: JSON.stringify({ settings: partial }),
        });
      } finally {
        setSyncing(false);
      }
    },
    [session?.user.id, session?.supabaseJwt, apiBase, patchSettings]
  );

  return { settings, updateSettings, syncing };
}
