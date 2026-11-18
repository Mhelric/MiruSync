import { useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';
import { resolveApiBase } from '../apiBase';
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
  shortTitles: boolean;
}

const DEFAULT_LOCAL_PREFS: LocalPrefs = {
  scoreFormatOverride: 'ACCOUNT',
  checkFrequency: '1h',
  recentSearches: [],
  shortTitles: true,
};

function loadLocalPrefs(): LocalPrefs {
  if (typeof window === 'undefined') return DEFAULT_LOCAL_PREFS;
  try {
    const raw = window.localStorage.getItem(LOCAL_PREFS_KEY);
    if (!raw) return DEFAULT_LOCAL_PREFS;
    const parsed = JSON.parse(raw) as Partial<LocalPrefs>;
    return {
      scoreFormatOverride: parsed.scoreFormatOverride ?? 'ACCOUNT',
      checkFrequency: parsed.checkFrequency ?? '1h',
      recentSearches: Array.isArray(parsed.recentSearches)
        ? parsed.recentSearches.slice(0, 8)
        : [],
      shortTitles: parsed.shortTitles ?? true,
    };
  } catch {
    return DEFAULT_LOCAL_PREFS;
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
  setShortTitles: (shortTitles: boolean) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useLocalPrefsStore = create<LocalPrefsStore>((set, get) => {
  const persist = (partial: Partial<LocalPrefs>) => {
    const next: LocalPrefs = {
      scoreFormatOverride: partial.scoreFormatOverride ?? get().scoreFormatOverride,
      checkFrequency: partial.checkFrequency ?? get().checkFrequency,
      recentSearches: partial.recentSearches ?? get().recentSearches,
      shortTitles: partial.shortTitles ?? get().shortTitles,
    };
    saveLocalPrefs(next);
    set(partial);
  };

  return {
    ...loadLocalPrefs(),
    setScoreFormatOverride: (scoreFormatOverride) => persist({ scoreFormatOverride }),
    setCheckFrequency: (checkFrequency) => persist({ checkFrequency }),
    setShortTitles: (shortTitles) => persist({ shortTitles }),
    addRecentSearch: (query) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const recentSearches = [
        trimmed,
        ...get().recentSearches.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, 8);
      persist({ recentSearches });
    },
    clearRecentSearches: () => persist({ recentSearches: [] }),
  };
});

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

const SETTINGS_STORAGE_KEY = 'mirusync:user_settings';
let loadedSettingsForUser = '';
let lastLocalSettingsEditAt = 0;

function loadCachedSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UserSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveCachedSettings(settings: UserSettings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

interface SettingsStore {
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
  patchSettings: (partial: Partial<UserSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: loadCachedSettings(),
  setSettings: (settings) => {
    saveCachedSettings(settings);
    set({ settings });
  },
  patchSettings: (partial) =>
    set((state) => {
      const next = { ...state.settings, ...partial };
      saveCachedSettings(next);
      return { settings: next };
    }),
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
    const userId = session?.user.id;
    if (!userId) {
      loadedSettingsForUser = '';
      return;
    }

    let cancelled = false;

    async function load() {
      if (loadedSettingsForUser === userId) return;
      loadedSettingsForUser = userId!;
      try {
        const res = await fetch(`${resolveApiBase(apiBase)}/api/user-sync`, {
          credentials: 'include',
          headers: buildSyncHeaders(session?.supabaseJwt),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { settings?: Partial<UserSettings> | null };
        const data = json.settings;
        if (!cancelled && data && Date.now() - lastLocalSettingsEditAt > 10_000) {
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
              if (Date.now() - lastLocalSettingsEditAt < 5_000) return;
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
      lastLocalSettingsEditAt = Date.now();
      patchSettings(partial);
      if (!session?.user.id) return;

      setSyncing(true);
      try {
        await fetch(`${resolveApiBase(apiBase)}/api/user-sync`, {
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
