import { useState } from 'react';
import { Bell, Info, LogOut, Moon, Palette, ShieldAlert, Sun, Trash2 } from 'lucide-react';
import {
  db,
  useAuthStore,
  useLocalPrefsStore,
  useSettingsSync,
  type AccentColor,
  type UserSettings,
} from '@mirusync/core';
import { MobileLayout } from '../layouts/MobileLayout';
import { API_BASE, saveMobileSession } from '../lib/mobileAuth';
import {
  updateAppearancePrefs,
  useAppearancePrefs,
  type CardStyle,
  type RadiusStyle,
  type TextScale,
} from '../lib/appearancePrefs';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const ACCENTS: { key: AccentColor; label: string; dot: string }[] = [
  { key: 'sky', label: 'Sky', dot: 'bg-sky-400' },
  { key: 'indigo', label: 'Indigo', dot: 'bg-indigo-400' },
  { key: 'emerald', label: 'Emerald', dot: 'bg-emerald-400' },
  { key: 'rose', label: 'Rose', dot: 'bg-rose-400' },
  { key: 'amber', label: 'Amber', dot: 'bg-amber-400' },
];

export function MobileSettingsPage() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const { settings, updateSettings } = useSettingsSync(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    API_BASE
  );

  const shortTitles = useLocalPrefsStore((s) => s.shortTitles);
  const setShortTitles = useLocalPrefsStore((s) => s.setShortTitles);
  const appearance = useAppearancePrefs();

  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSignOut() {
    saveMobileSession(null);
    setSession(null);
  }

  async function handleDeleteCloudData() {
    if (!session?.supabaseJwt) return;
    const res = await fetch(`${API_BASE}/api/account-delete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.supabaseJwt}` },
    });
    if (res.ok) {
      await db.listCache.clear();
      await db.pendingEdits.clear();
      saveMobileSession(null);
      setSession(null);
    }
  }

  return (
    <MobileLayout title="Settings" showBack hideBottomNav>
      <div className="space-y-4">
        {/* Theme & Accent */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400">
            <Palette className="h-3.5 w-3.5 text-sky-400" />
            Appearance
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void updateSettings({ theme: 'dark' })}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium cursor-pointer ${
                settings.theme === 'dark'
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                  : 'border-slate-800 bg-slate-950/60 text-slate-300'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              Dark
            </button>
            <button
              type="button"
              onClick={() => void updateSettings({ theme: 'light' })}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium cursor-pointer ${
                settings.theme === 'light'
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                  : 'border-slate-800 bg-slate-950/60 text-slate-300'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              Light
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-300 font-medium">Accent Color</div>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => void updateSettings({ accent_color: a.key })}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${
                    settings.accent_color === a.key
                      ? 'border-sky-500/40 bg-sky-500/15 text-slate-100 font-semibold'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${a.dot}`} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="text-xs text-slate-300 font-medium">Card Surface</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'glass', label: 'Frosted Glass' },
                { key: 'solid', label: 'Solid Cards' },
              ] as { key: CardStyle; label: string }[]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => updateAppearancePrefs({ cardStyle: opt.key })}
                  className={`rounded-xl border py-2 text-xs font-medium cursor-pointer ${
                    appearance.cardStyle === opt.key
                      ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-300 font-medium">Corner Style</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'rounded', label: 'Soft Rounded' },
                { key: 'sharp', label: 'Sleek Crisp' },
              ] as { key: RadiusStyle; label: string }[]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => updateAppearancePrefs({ radiusStyle: opt.key })}
                  className={`rounded-xl border py-2 text-xs font-medium cursor-pointer ${
                    appearance.radiusStyle === opt.key
                      ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-300 font-medium">Text Size</div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'compact', label: 'Compact' },
                { key: 'normal', label: 'Normal' },
                { key: 'large', label: 'Large' },
              ] as { key: TextScale; label: string }[]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => updateAppearancePrefs({ textScale: opt.key })}
                  className={`rounded-xl border py-2 text-xs font-medium cursor-pointer ${
                    appearance.textScale === opt.key
                      ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Display & List */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3.5">
          <div className="text-xs font-mono uppercase text-slate-400">
            Titles &amp; List
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">
              Title Language
            </label>
            <select
              value={settings.title_language}
              onChange={(e) =>
                void updateSettings({
                  title_language: e.target.value as UserSettings['title_language'],
                })
              }
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200"
            >
              <option value="romaji">Romaji</option>
              <option value="english">English</option>
              <option value="native">Native (Japanese)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-medium">
              Default Tracker Layout
            </label>
            <select
              value={settings.list_layout}
              onChange={(e) =>
                void updateSettings({
                  list_layout: e.target.value as UserSettings['list_layout'],
                })
              }
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200"
            >
              <option value="grid">Poster Grid</option>
              <option value="list">Detailed List</option>
              <option value="compact">Compact Rows</option>
            </select>
          </div>

          <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer">
            <span className="text-xs text-slate-200">Shorten Long Titles</span>
            <input
              type="checkbox"
              checked={shortTitles}
              onChange={(e) => setShortTitles(e.target.checked)}
              className="h-4 w-4 accent-sky-500"
            />
          </label>
        </section>

        {/* Notifications & Content */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400">
            <Bell className="h-3.5 w-3.5 text-sky-400" />
            Notifications &amp; Content
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-xs text-slate-200">Airing Notifications</span>
            <input
              type="checkbox"
              checked={settings.notifications_enabled}
              onChange={(e) =>
                void updateSettings({
                  notifications_enabled: e.target.checked,
                })
              }
              className="h-4 w-4 accent-sky-500"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-xs text-slate-200">Spoiler Blur</span>
            <input
              type="checkbox"
              checked={settings.spoiler_blur}
              onChange={(e) =>
                void updateSettings({ spoiler_blur: e.target.checked })
              }
              className="h-4 w-4 accent-sky-500"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-xs text-slate-200">Show Adult (18+)</span>
            <input
              type="checkbox"
              checked={settings.show_adult}
              onChange={(e) =>
                void updateSettings({ show_adult: e.target.checked })
              }
              className="h-4 w-4 accent-sky-500"
            />
          </label>
        </section>

        {/* Sign Out */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 py-2.5 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-400" />
            Sign Out
          </button>
        </section>

        {/* Danger Zone */}
        <section className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-rose-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            Account Data
          </div>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-300 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Cloud Data
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-rose-200">
                Permanently erase MiruSync cloud preferences and local cache? (Your MAL/AniList account stays intact.)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 py-2 text-xs text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteCloudData()}
                  className="flex-1 rounded-xl bg-rose-500 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </section>

        {/* About */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between text-xs text-slate-400">
          <span className="inline-flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-sky-400" />
            MiruSync Android
          </span>
          <span className="font-mono">AniList + MyAnimeList</span>
        </section>
      </div>
    </MobileLayout>
  );
}
