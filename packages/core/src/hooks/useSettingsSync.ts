import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { useAuthStore } from '../auth/store';
import type { ScoreFormat } from '../providers/types';
import { getSupabaseClient } from '../supabase/client';

export type AccentColor = 'sky' | 'indigo' | 'emerald' | 'rose' | 'amber';
export type CheckFrequency = '15m' | '30m' | '1h' | '6h';
export type ScoreFormatOverride = 'ACCOUNT' | ScoreFormat;

const LOCAL_PREFS_KEY = 'mirusync:local_prefs';

interface LocalPrefs {
  scoreFormatOverride: ScoreFormatOverride;
  checkFrequency: CheckFrequency;
  recentSearches: string[];
}

function loadLocalPrefs(): LocalPrefs {
  if (typeof window === 'undefined') {
    return { scoreFormatOverride: 'ACCOUNT', checkFrequency: '1h', recentSearches: [] };
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_PREFS_KEY);
    if (!raw) {
      return { scoreFormatOverride: 'ACCOUNT', checkFrequency: '1h', recentSearches: [] };
    }
    const parsed = JSON.parse(raw) as Partial<LocalPrefs>;
    return {
      scoreFormatOverride: parsed.scoreFormatOverride ?? 'ACCOUNT',
      checkFrequency: parsed.checkFrequency ?? '1h',
      recentSearches: Array.isArray(parsed.recentSearches)
        ? parsed.recentSearches.slice(0, 8)
        : [],
    };
  } catch {
    return { scoreFormatOverride: 'ACCOUNT', checkFrequency: '1h', recentSearches: [] };
  }
}

function saveLocalPrefs(prefs: LocalPrefs) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

interface LocalPrefsStore extends LocalPrefs {
  setScoreFormatOverride: (format: ScoreFormatOverride) => void;
  setCheckFrequency: (freq: CheckFrequency) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useLocalPrefsStore = create<LocalPrefsStore>((set, get) => ({
  ...loadLocalPrefs(),
  setScoreFormatOverride: (scoreFormatOverride) => {
    const next: LocalPrefs = {
      scoreFormatOverride,
      checkFrequency: get().checkFrequency,
      recentSearches: get().recentSearches,
    };
    saveLocalPrefs(next);
    set({ scoreFormatOverride });
  },
  setCheckFrequency: (checkFrequency) => {
    const next: LocalPrefs = {
      scoreFormatOverride: get().scoreFormatOverride,
      checkFrequency,
      recentSearches: get().recentSearches,
    };
    saveLocalPrefs(next);
    set({ checkFrequency });
  },
  addRecentSearch: (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const recentSearches = [
      trimmed,
      ...get().recentSearches.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, 8);
    const next: LocalPrefs = {
      scoreFormatOverride: get().scoreFormatOverride,
      checkFrequency: get().checkFrequency,
      recentSearches,
    };
    saveLocalPrefs(next);
    set({ recentSearches });
  },
  clearRecentSearches: () => {
    const next: LocalPrefs = {
      scoreFormatOverride: get().scoreFormatOverride,
      checkFrequency: get().checkFrequency,
      recentSearches: [],
    };
    saveLocalPrefs(next);
    set({ recentSearches: [] });
  },
}));

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
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolvedDark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && mediaQuery.matches);
      const root = document.documentElement;
      root.classList.toggle('dark', resolvedDark);
      root.classList.toggle('light', !resolvedDark);
    };

    applyTheme();

    if (settings.theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [settings.theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.accent = settings.accent_color || 'sky';
  }, [settings.accent_color]);

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

    let channel: ReturnType<NonNullable<typeof client>['channel']> | undefined;
    if (client) {
      try {
        const suffix = Math.random().toString(36).slice(2, 9);
        channel = client
          .channel(`settings:${session.user.id}:${suffix}`)
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
