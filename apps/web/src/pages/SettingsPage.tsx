import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Download, Info, Shield, Trash2, Upload } from 'lucide-react';
import {
  db,
  getDefaultApiBase,
  registerWebPush,
  useAuthStore,
  useLocalPrefsStore,
  useMediaList,
  useProvider,
  useSettingsSync,
  type AccentColor,
  type CheckFrequency,
  type EntryUpdate,
  type ListEntry,
  type ListStatus,
  type ProviderId,
  type ScoreFormatOverride,
  type UserSettings,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

const ACCENT_OPTIONS: { key: AccentColor; label: string; swatch: string }[] = [
  { key: 'sky', label: 'Sky', swatch: 'bg-sky-500' },
  { key: 'indigo', label: 'Indigo', swatch: 'bg-indigo-500' },
  { key: 'emerald', label: 'Emerald', swatch: 'bg-emerald-500' },
  { key: 'rose', label: 'Rose', swatch: 'bg-rose-500' },
  { key: 'amber', label: 'Amber', swatch: 'bg-amber-500' },
];

interface ParsedImportPreview {
  fileName: string;
  totalParsed: number;
  readyUpdates: EntryUpdate[];
  skippedCount: number;
}

function mapMalXmlStatus(raw: string): ListStatus {
  const s = raw.trim().toLowerCase();
  if (s === 'watching' || s === 'reading') return 'CURRENT';
  if (s === 'completed') return 'COMPLETED';
  if (s === 'on-hold' || s === 'on hold') return 'PAUSED';
  if (s === 'dropped') return 'DROPPED';
  return 'PLANNING';
}

function resolveTargetMediaId(
  provider: ProviderId,
  alId?: number,
  malId?: number,
  rawId?: string
): string | null {
  if (provider === 'mal') {
    if (malId) return `mal:${malId}`;
    if (rawId?.startsWith('mal:')) return rawId;
    return null;
  }
  if (alId) return `al:${alId}`;
  if (rawId?.startsWith('al:')) return rawId;
  return null;
}

function parseImportFile(
  fileName: string,
  text: string,
  provider: ProviderId
): ParsedImportPreview {
  const readyUpdates: EntryUpdate[] = [];
  let totalParsed = 0;
  let skippedCount = 0;

  if (fileName.toLowerCase().endsWith('.json') || text.trim().startsWith('{')) {
    const parsed = JSON.parse(text) as {
      anime?: ListEntry[];
      manga?: ListEntry[];
    };
    const all = [...(parsed.anime ?? []), ...(parsed.manga ?? [])];
    totalParsed = all.length;

    for (const entry of all) {
      const targetId = resolveTargetMediaId(
        provider,
        entry.media?.alId,
        entry.media?.malId,
        entry.media?.id
      );
      if (!targetId || !entry.media?.type) {
        skippedCount += 1;
        continue;
      }
      readyUpdates.push({
        mediaId: targetId,
        type: entry.media.type,
        status: entry.status,
        progress: entry.progress,
        progressVolumes: entry.progressVolumes,
        score: entry.score,
        startedAt: entry.startedAt,
        completedAt: entry.completedAt,
        repeat: entry.repeat,
        notes: entry.notes,
      });
    }
    return { fileName, totalParsed, readyUpdates, skippedCount };
  }

  // MAL XML export format
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid JSON or MAL XML file.');
  }

  const animeNodes = Array.from(doc.querySelectorAll('myanimelist > anime'));
  const mangaNodes = Array.from(doc.querySelectorAll('myanimelist > manga'));
  totalParsed = animeNodes.length + mangaNodes.length;

  for (const node of animeNodes) {
    const malId = Number(node.querySelector('series_animedb_id')?.textContent || '0');
    const targetId = resolveTargetMediaId(provider, undefined, malId);
    if (!targetId) {
      skippedCount += 1;
      continue;
    }
    const rawScore = Number(node.querySelector('my_score')?.textContent || '0');
    readyUpdates.push({
      mediaId: targetId,
      type: 'ANIME',
      status: mapMalXmlStatus(node.querySelector('my_status')?.textContent || ''),
      progress: Number(node.querySelector('my_watched_episodes')?.textContent || '0'),
      score: rawScore > 0 ? rawScore * 10 : undefined,
    });
  }

  for (const node of mangaNodes) {
    const malId = Number(node.querySelector('manga_mangadb_id')?.textContent || '0');
    const targetId = resolveTargetMediaId(provider, undefined, malId);
    if (!targetId) {
      skippedCount += 1;
      continue;
    }
    const rawScore = Number(node.querySelector('my_score')?.textContent || '0');
    readyUpdates.push({
      mediaId: targetId,
      type: 'MANGA',
      status: mapMalXmlStatus(node.querySelector('my_status')?.textContent || ''),
      progress: Number(node.querySelector('my_read_chapters')?.textContent || '0'),
      progressVolumes: Number(node.querySelector('my_read_volumes')?.textContent || '0'),
      score: rawScore > 0 ? rawScore * 10 : undefined,
    });
  }

  return { fileName, totalParsed, readyUpdates, skippedCount };
}

export function SettingsPage() {
  const session = useAuthStore((s) => s.session);
  const logoutWeb = useAuthStore((s) => s.logoutWeb);
  const provider = useProvider();
  const { settings, updateSettings, syncing } = useSettingsSync(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
  const scoreFormatOverride = useLocalPrefsStore((s) => s.scoreFormatOverride);
  const setScoreFormatOverride = useLocalPrefsStore((s) => s.setScoreFormatOverride);
  const checkFrequency = useLocalPrefsStore((s) => s.checkFrequency);
  const setCheckFrequency = useLocalPrefsStore((s) => s.setCheckFrequency);
  const shortTitles = useLocalPrefsStore((s) => s.shortTitles);
  const setShortTitles = useLocalPrefsStore((s) => s.setShortTitles);

  const { data: animeList } = useMediaList('ANIME');
  const { data: mangaList } = useMediaList('MANGA');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importPreview, setImportPreview] = useState<ParsedImportPreview | null>(null);
  const [importProgress, setImportProgress] = useState<{
    done: number;
    total: number;
    failed: number;
  } | null>(null);

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

  async function handleSelectImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    try {
      const text = await file.text();
      const preview = parseImportFile(file.name, text, session.provider);
      setImportPreview(preview);
      setImportProgress(null);
      setPushMessage(null);
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : 'Failed to parse backup file.');
      setImportPreview(null);
    } finally {
      e.target.value = '';
    }
  }

  async function handleRunImport() {
    if (!importPreview || !provider) return;
    const items = importPreview.readyUpdates;
    let done = 0;
    let failed = 0;
    setImportProgress({ done: 0, total: items.length, failed: 0 });

    for (const update of items) {
      try {
        await provider.updateEntry(update);
      } catch {
        failed += 1;
      }
      done += 1;
      setImportProgress({ done, total: items.length, failed });
      await new Promise((r) => setTimeout(r, 350));
    }
    setPushMessage(
      `Import finished: ${done - failed} synced${failed > 0 ? `, ${failed} failed` : ''}.`
    );
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
    const res = await fetch(`${getDefaultApiBase()}/api/account-delete`, {
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

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Default List Layout
              </label>
              <select
                value={settings.list_layout}
                onChange={(e) =>
                  void updateSettings({
                    list_layout: e.target.value as UserSettings['list_layout'],
                  })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="grid">Poster Grid</option>
                <option value="list">Detailed List</option>
                <option value="compact">Compact Rows</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Score Format Display
              </label>
              <select
                value={scoreFormatOverride}
                onChange={(e) =>
                  setScoreFormatOverride(e.target.value as ScoreFormatOverride)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="ACCOUNT">Follow Account Default</option>
                <option value="POINT_100">100-Point (e.g. 85)</option>
                <option value="POINT_10">10-Point (e.g. 9)</option>
                <option value="POINT_10_DECIMAL">10-Point Decimal (e.g. 8.5)</option>
                <option value="POINT_5">5-Star (e.g. 4★)</option>
                <option value="POINT_3">3-Smiley (:))</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Accent Color</label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((opt) => {
                const active = settings.accent_color === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => void updateSettings({ accent_color: opt.key })}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                      active
                        ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                        : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${opt.swatch}`} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
            <div>
              <div className="text-sm font-medium text-slate-200">
                Shorten Long Titles
              </div>
              <div className="text-xs text-slate-400">
                Prefer shorter titles and trim long subtitles on cards
              </div>
            </div>
            <input
              type="checkbox"
              checked={shortTitles}
              onChange={(e) => setShortTitles(e.target.checked)}
              className="h-4 w-4 accent-sky-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/70">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Schedule Check Frequency
              </label>
              <select
                value={checkFrequency}
                onChange={(e) => setCheckFrequency(e.target.value as CheckFrequency)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="15m">Every 15 minutes</option>
                <option value="30m">Every 30 minutes</option>
                <option value="1h">Every hour</option>
                <option value="6h">Every 6 hours</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Quiet Hours</label>
                <input
                  type="checkbox"
                  checked={Boolean(settings.quiet_hours)}
                  onChange={(e) =>
                    void updateSettings({
                      quiet_hours: e.target.checked
                        ? { start: '23:00', end: '07:00' }
                        : null,
                    })
                  }
                  className="h-3.5 w-3.5 accent-sky-500 cursor-pointer"
                />
              </div>
              {settings.quiet_hours ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={settings.quiet_hours.start}
                    onChange={(e) =>
                      void updateSettings({
                        quiet_hours: {
                          start: e.target.value,
                          end: settings.quiet_hours?.end ?? '07:00',
                        },
                      })
                    }
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="time"
                    value={settings.quiet_hours.end}
                    onChange={(e) =>
                      void updateSettings({
                        quiet_hours: {
                          start: settings.quiet_hours?.start ?? '23:00',
                          end: e.target.value,
                        },
                      })
                    }
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-2">Disabled</p>
              )}
            </div>
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

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.xml"
            onChange={(e) => void handleSelectImportFile(e)}
            className="hidden"
          />

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
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              Import JSON / MAL XML
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

          {importPreview && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-200">
                  {importPreview.fileName}
                </span>
                <span className="font-mono text-slate-400">
                  {importPreview.readyUpdates.length} ready · {importPreview.skippedCount} skipped
                  ({importPreview.totalParsed} total)
                </span>
              </div>

              {importProgress && (
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-sky-400">
                    Syncing {importProgress.done} / {importProgress.total}…
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all"
                      style={{
                        width: `${importProgress.total > 0 ? Math.round((importProgress.done / importProgress.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={importPreview.readyUpdates.length === 0 || Boolean(importProgress && importProgress.done < importProgress.total)}
                  onClick={() => void handleRunImport()}
                  className="rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 px-3.5 py-1.5 text-xs font-semibold text-slate-950 cursor-pointer"
                >
                  Apply Import to {session?.provider === 'mal' ? 'MAL' : 'AniList'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportPreview(null);
                    setImportProgress(null);
                  }}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </section>

        {/* About */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-200">About MiruSync</h2>
            <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-mono text-slate-400">
              v1.1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unified anime and manga tracker powered by MyAnimeList API v2, AniList GraphQL,
            MangaDex API, and Anime News Network RSS.
          </p>
          <p className="text-[11px] text-slate-500">
            Open-source libraries: React, TypeScript, Vite, Tailwind CSS, TanStack Query,
            Zustand, Dexie, Lucide Icons, and Capacitor.
          </p>
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
