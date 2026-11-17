import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Download, Shield, Trash2 } from 'lucide-react';
import {
  db,
  registerWebPush,
  useAuthStore,
  useMediaList,
  useSettingsSync,
  type UserSettings,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export function SettingsPage() {
  const session = useAuthStore((s) => s.session);
  const logoutWeb = useAuthStore((s) => s.logoutWeb);
  const { settings, updateSettings, syncing } = useSettingsSync(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
  const { data: animeList } = useMediaList('ANIME');
  const { data: mangaList } = useMediaList('MANGA');

  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleExportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      provider: session?.provider,
      user: session?.user,
      anime: animeList ?? [],
      manga: mangaList ?? [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mirusync-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleClearCache() {
    await db.listCache.clear();
    setPushMessage('Offline cache cleared.');
  }

  async function handleEnableWebPush() {
    if (!session?.supabaseJwt || !VAPID_PUBLIC_KEY) {
      setPushMessage('Web Push is not configured yet (missing VAPID key).');
      return;
    }
    const ok = await registerWebPush(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      session.supabaseJwt,
      session.user.id,
      VAPID_PUBLIC_KEY
    );
    setPushMessage(
      ok ? 'Desktop push notifications enabled!' : 'Notification permission denied.'
    );
  }

  async function handleDeleteAccount() {
    const res = await fetch('/api/account-delete', {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      await db.listCache.clear();
      await db.pendingEdits.clear();
      await logoutWeb();
    }
  }

  return (
    <DesktopLayout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-slate-400">
              Changes sync live across your Desktop and Android devices.
            </p>
          </div>
          {syncing && (
            <span className="text-xs font-mono text-sky-400">Syncing…</span>
          )}
        </div>

        {/* Appearance & Titles */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Appearance &amp; Display
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  void updateSettings({
                    theme: e.target.value as UserSettings['theme'],
                  })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Title Language
              </label>
              <select
                value={settings.title_language}
                onChange={(e) =>
                  void updateSettings({
                    title_language: e.target.value as UserSettings['title_language'],
                  })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="romaji">Romaji</option>
                <option value="english">English</option>
                <option value="native">Native (Japanese)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-sm font-medium text-slate-200">
                Spoiler Blur
              </div>
              <div className="text-xs text-slate-400">
                Blur synopses for unfinished titles
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.spoiler_blur}
              onChange={(e) =>
                void updateSettings({ spoiler_blur: e.target.checked })
              }
              className="h-4 w-4 accent-sky-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
            <div>
              <div className="text-sm font-medium text-slate-200">
                Show Adult (18+) Content
              </div>
              <div className="text-xs text-slate-400">
                Hidden by default for Google Play compliance
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.show_adult}
              onChange={(e) =>
                void updateSettings({ show_adult: e.target.checked })
              }
              className="h-4 w-4 accent-sky-500 cursor-pointer"
            />
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Notifications</h2>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-200">
                Episode &amp; Chapter Alerts
              </div>
              <div className="text-xs text-slate-400">
                Receive alerts when followed titles air or release chapters
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications_enabled}
              onChange={(e) =>
                void updateSettings({ notifications_enabled: e.target.checked })
              }
              className="h-4 w-4 accent-sky-500 cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleEnableWebPush()}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 px-3.5 py-2 text-xs font-medium text-sky-300 cursor-pointer"
          >
            <Bell className="h-3.5 w-3.5" />
            Enable Desktop Push Notifications
          </button>

          {pushMessage && (
            <p className="text-xs text-slate-400">{pushMessage}</p>
          )}
        </section>

        {/* Data & Privacy */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Data, Backup &amp; Privacy
          </h2>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON Backup
            </button>

            <button
              type="button"
              onClick={() => void handleClearCache()}
              className="rounded-lg border border-slate-700 hover:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 cursor-pointer"
            >
              Clear Offline Cache
            </button>

            <Link
              to="/privacy"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200"
            >
              <Shield className="h-3.5 w-3.5 text-sky-400" />
              Privacy Policy
            </Link>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-rose-300">Danger Zone</h2>
          <p className="text-xs text-slate-400">
            Deleting your MiruSync account removes your cloud settings, push tokens,
            and notification history from Supabase. Your MyAnimeList or AniList
            account itself is not affected.
          </p>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-medium text-rose-300 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete MiruSync Cloud Data
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                className="rounded-lg bg-rose-500 hover:bg-rose-400 px-3.5 py-2 text-xs font-semibold text-slate-950 cursor-pointer"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      </div>
    </DesktopLayout>
  );
}
