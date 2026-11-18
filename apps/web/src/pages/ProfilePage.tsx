import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  LogOut,
  Settings,
  Sparkles,
  Star,
  Tv,
} from 'lucide-react';
import {
  formatMediaTitle,
  useAuthStore,
  useMediaList,
  useProfileDetails,
  useSettingsStore,
  type ListEntry,
  type ListStatus,
  type MediaType,
  type ProfileActivityEvent,
  type ProfileActivityPoint,
  type ProfileFavoriteItem,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';
import { AniListIcon, MalIcon } from '../components/BrandIcons';

const STATUS_LABELS: { key: ListStatus; label: string; color: string }[] = [
  { key: 'CURRENT', label: 'Watching / Reading', color: 'bg-sky-500' },
  { key: 'COMPLETED', label: 'Completed', color: 'bg-emerald-500' },
  { key: 'PLANNING', label: 'Plan to Watch / Read', color: 'bg-indigo-500' },
  { key: 'PAUSED', label: 'On Hold', color: 'bg-amber-500' },
  { key: 'DROPPED', label: 'Dropped', color: 'bg-rose-500' },
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAY_ROWS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

interface HeatmapCell {
  date: string;
  label: string;
  amount: number;
  level: number;
  isFuture: boolean;
}

interface HeatmapGridData {
  weeks: HeatmapCell[][];
  monthLabels: (string | null)[];
  totalUpdates: number;
  activeDays: number;
  currentStreak: number;
  bestStreak: number;
}

function toUtcDateKey(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

function formatUtcDateLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatRelativeTime(epochMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - epochMs) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(epochMs).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function amountToLevel(amount: number): number {
  if (amount >= 6) return 4;
  if (amount >= 3) return 3;
  if (amount >= 2) return 2;
  if (amount > 0) return 1;
  return 0;
}

function incrementDateMap(map: Map<string, number>, key?: string) {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function buildHeatmapData(
  history: ProfileActivityPoint[],
  recentActivities: ProfileActivityEvent[],
  entries: ListEntry[]
): HeatmapGridData {
  const historyMap = new Map<string, ProfileActivityPoint>();
  for (const point of history) {
    historyMap.set(point.date, point);
  }

  const activityCounts = new Map<string, number>();
  for (const act of recentActivities) {
    incrementDateMap(activityCounts, toUtcDateKey(act.createdAt));
  }

  const listCounts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.updatedAt) {
      incrementDateMap(listCounts, toUtcDateKey(entry.updatedAt));
    }
    incrementDateMap(listCounts, entry.startedAt);
    incrementDateMap(listCounts, entry.completedAt);
  }

  const now = new Date();
  const todayUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const todayDow = new Date(todayUtcMs).getUTCDay();
  const dayMs = 86400 * 1000;
  const totalWeeks = 53;
  const startUtcMs = todayUtcMs - (52 * 7 + todayDow) * dayMs;

  const weeks: HeatmapCell[][] = [];
  const monthLabels: (string | null)[] = [];
  const flatValidDays: HeatmapCell[] = [];

  let totalUpdates = 0;
  let activeDays = 0;

  for (let w = 0; w < totalWeeks; w++) {
    const col: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cellMs = startUtcMs + (w * 7 + d) * dayMs;
      const isFuture = cellMs > todayUtcMs;
      const dateStr = toUtcDateKey(cellMs);

      const hp = historyMap.get(dateStr);
      const effectiveAmount = isFuture
        ? 0
        : Math.max(
            hp?.amount ?? 0,
            activityCounts.get(dateStr) ?? 0,
            listCounts.get(dateStr) ?? 0
          );
      const level = isFuture
        ? 0
        : hp && hp.amount === effectiveAmount && hp.level > 0
          ? Math.min(4, hp.level)
          : amountToLevel(effectiveAmount);

      const cell: HeatmapCell = {
        date: dateStr,
        label: formatUtcDateLabel(dateStr),
        amount: effectiveAmount,
        level,
        isFuture,
      };
      col.push(cell);

      if (!isFuture) {
        flatValidDays.push(cell);
        totalUpdates += effectiveAmount;
        if (effectiveAmount > 0) activeDays += 1;
      }
    }
    weeks.push(col);

    const firstCellDt = new Date(startUtcMs + w * 7 * dayMs);
    const colMonth = firstCellDt.getUTCMonth();
    const laterCellDt = new Date(
      startUtcMs + Math.min(totalWeeks - 1, w + 3) * 7 * dayMs
    );
    const prevWeekMonth =
      w > 0 ? new Date(startUtcMs + (w - 1) * 7 * dayMs).getUTCMonth() : -1;
    if (colMonth !== prevWeekMonth && laterCellDt.getUTCMonth() === colMonth) {
      monthLabels.push(SHORT_MONTHS[colMonth]);
    } else {
      monthLabels.push(null);
    }
  }

  let bestStreak = 0;
  let running = 0;
  for (const day of flatValidDays) {
    if (day.amount > 0) {
      running += 1;
      if (running > bestStreak) bestStreak = running;
    } else {
      running = 0;
    }
  }

  let currentStreak = 0;
  let idx = flatValidDays.length - 1;
  if (idx >= 0 && flatValidDays[idx].amount === 0) {
    idx -= 1;
  }
  while (idx >= 0 && flatValidDays[idx].amount > 0) {
    currentStreak += 1;
    idx -= 1;
  }

  return {
    weeks,
    monthLabels,
    totalUpdates,
    activeDays,
    currentStreak,
    bestStreak,
  };
}

function buildFallbackFavorites(
  entries: ListEntry[],
  kind: 'ANIME' | 'MANGA',
  titleLang: 'romaji' | 'english' | 'native'
): ProfileFavoriteItem[] {
  return [...entries]
    .filter((e) => (e.score ?? 0) >= 80)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 12)
    .map((e) => ({
      id: e.media.id,
      kind,
      title: formatMediaTitle(e.media, titleLang),
      subtitle:
        [e.media.format, e.media.seasonYear].filter(Boolean).join(' · ') || undefined,
      imageUrl: e.media.coverUrl,
      mediaType: e.media.type,
      score: e.score,
    }));
}

function formatListStatusVerb(status: ListStatus, type: MediaType): string {
  switch (status) {
    case 'CURRENT':
      return type === 'ANIME' ? 'Watching' : 'Reading';
    case 'COMPLETED':
      return 'Completed';
    case 'PLANNING':
      return type === 'ANIME' ? 'Plan to watch' : 'Plan to read';
    case 'PAUSED':
      return 'On hold';
    case 'DROPPED':
      return 'Dropped';
    case 'REPEATING':
      return type === 'ANIME' ? 'Rewatching' : 'Rereading';
  }
}

function synthesizeRecentActivities(entries: ListEntry[]): ProfileActivityEvent[] {
  return [...entries]
    .filter((e) => e.updatedAt > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 12)
    .map((e) => ({
      id: `entry:${e.media.id}:${e.updatedAt}`,
      status: formatListStatusVerb(e.status, e.media.type),
      progress:
        e.progress > 0
          ? e.media.type === 'ANIME'
            ? `ep. ${e.progress}`
            : `ch. ${e.progress}`
          : undefined,
      createdAt: e.updatedAt,
      media: {
        id: e.media.id,
        type: e.media.type,
        title: e.media.title,
        coverUrl: e.media.coverUrl,
      },
    }));
}

function ActivityHeatmapSection({ grid }: { grid: HeatmapGridData }) {
  const [hovered, setHovered] = useState<HeatmapCell | null>(null);

  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-sm font-semibold text-slate-100">Activity History</h2>
          <span className="text-xs text-slate-400">
            {grid.totalUpdates} {grid.totalUpdates === 1 ? 'update' : 'updates'} in the last year
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          {hovered ? (
            <span className="text-slate-200 font-medium">
              {hovered.amount} {hovered.amount === 1 ? 'update' : 'updates'} on{' '}
              {hovered.label}
            </span>
          ) : (
            <span>
              {grid.activeDays} active {grid.activeDays === 1 ? 'day' : 'days'}
              {grid.currentStreak > 0
                ? ` · ${grid.currentStreak}d current streak`
                : grid.bestStreak > 0
                  ? ` · best ${grid.bestStreak}d`
                  : ''}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto pt-1">
        <div className="min-w-[680px] space-y-1.5">
          {/* Month labels aligned to the 53 week columns */}
          <div className="flex items-center gap-2">
            <div className="w-7 shrink-0" />
            <div
              className="flex-1 grid gap-[3px]"
              style={{ gridTemplateColumns: 'repeat(53, minmax(0, 1fr))' }}
            >
              {grid.monthLabels.map((label, i) => (
                <div
                  key={i}
                  className="text-[11px] text-slate-400 leading-none overflow-visible whitespace-nowrap"
                >
                  {label ?? ''}
                </div>
              ))}
            </div>
          </div>

          {/* Weekday labels + 53 week columns */}
          <div className="flex items-stretch gap-2">
            <div className="w-7 shrink-0 grid grid-rows-7 gap-[3px] text-[10px] text-slate-400">
              {WEEKDAY_ROWS.map((day, idx) => (
                <div key={idx} className="flex items-center leading-none">
                  {day}
                </div>
              ))}
            </div>

            <div
              className="flex-1 grid gap-[3px]"
              style={{ gridTemplateColumns: 'repeat(53, minmax(0, 1fr))' }}
              onMouseLeave={() => setHovered(null)}
            >
              {grid.weeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-rows-7 gap-[3px]">
                  {week.map((cell, dIdx) =>
                    cell.isFuture ? (
                      <div key={dIdx} className="w-full aspect-square" aria-hidden="true" />
                    ) : (
                      <button
                        key={cell.date}
                        type="button"
                        onMouseEnter={() => setHovered(cell)}
                        onFocus={() => setHovered(cell)}
                        title={`${cell.amount} ${cell.amount === 1 ? 'update' : 'updates'} on ${cell.label}`}
                        aria-label={`${cell.amount} updates on ${cell.label}`}
                        className={`w-full aspect-square rounded-[2px] transition-opacity hover:ring-1 hover:ring-slate-300 focus:outline-none gh-cell-${cell.level}`}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400 pt-0.5">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <span
            key={lvl}
            className={`h-2.5 w-2.5 rounded-[2px] gh-cell-${lvl}`}
            aria-hidden="true"
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}

function FavoritesSection({
  animeFavs,
  mangaFavs,
  characterFavs,
  animeFallback,
  mangaFallback,
  isLoading,
}: {
  animeFavs: ProfileFavoriteItem[];
  mangaFavs: ProfileFavoriteItem[];
  characterFavs: ProfileFavoriteItem[];
  animeFallback: boolean;
  mangaFallback: boolean;
  isLoading: boolean;
}) {
  const [tab, setTab] = useState<'ANIME' | 'MANGA' | 'CHARACTER'>('ANIME');

  const tabs: { key: 'ANIME' | 'MANGA' | 'CHARACTER'; label: string; count: number }[] = [
    { key: 'ANIME', label: 'Anime', count: animeFavs.length },
    { key: 'MANGA', label: 'Manga', count: mangaFavs.length },
    { key: 'CHARACTER', label: 'Characters', count: characterFavs.length },
  ];

  const activeItems =
    tab === 'ANIME' ? animeFavs : tab === 'MANGA' ? mangaFavs : characterFavs;
  const showingFallback =
    (tab === 'ANIME' && animeFallback) || (tab === 'MANGA' && mangaFallback);

  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-100">Favorites</h2>
          {showingFallback && activeItems.length > 0 && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              Top Rated on List
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {t.label}
              <span className="font-mono text-[10px] opacity-80">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading && activeItems.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-xl bg-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : activeItems.length === 0 ? (
        <p className="text-xs text-slate-400 py-4">
          {tab === 'CHARACTER'
            ? 'No favorite characters synced from your profile yet.'
            : `No favorite ${tab.toLowerCase()} found yet. Star titles on your profile or score titles 8+ to feature them here.`}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {activeItems.map((item) => {
            const cardInner = (
              <div className="group rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden hover:border-sky-500/40 transition-all h-full flex flex-col">
                <div className="relative aspect-[3/4] bg-slate-800 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-500">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  )}
                  {item.score && item.score > 0 && (
                    <span className="absolute top-2 right-2 rounded-md bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-300 flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      {item.score}%
                    </span>
                  )}
                </div>
                <div className="p-2.5 space-y-0.5 flex-1">
                  <div className="text-xs font-medium text-slate-100 line-clamp-2 group-hover:text-sky-300 transition-colors">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.subtitle ??
                      (item.kind === 'CHARACTER' ? 'Favorite Character' : item.kind)}
                  </div>
                </div>
              </div>
            );

            if (item.kind === 'CHARACTER') {
              return <div key={item.id}>{cardInner}</div>;
            }

            const routeType = (item.mediaType ?? item.kind).toLowerCase();
            return (
              <Link
                key={item.id}
                to={`/media/${routeType}/${encodeURIComponent(item.id)}`}
              >
                {cardInner}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RecentActivitySection({
  activities,
  titleLang,
}: {
  activities: ProfileActivityEvent[];
  titleLang: 'romaji' | 'english' | 'native';
}) {
  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">Recent Activity</h2>
        <span className="text-xs font-mono text-slate-400">
          {activities.length} recent
        </span>
      </div>

      {activities.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">
          No recent tracker activity recorded yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activities.map((act) => {
            const title = formatMediaTitle(act.media, titleLang);
            const actionLabel = act.progress
              ? `${act.status} ${act.progress}`
              : act.status;
            return (
              <Link
                key={act.id}
                to={`/media/${act.media.type.toLowerCase()}/${encodeURIComponent(act.media.id)}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 hover:border-sky-500/40 transition-colors"
              >
                {act.media.coverUrl ? (
                  <img
                    src={act.media.coverUrl}
                    alt={title}
                    loading="lazy"
                    className="h-14 w-10 rounded-md object-cover shrink-0 bg-slate-800"
                  />
                ) : (
                  <div className="h-14 w-10 rounded-md bg-slate-800 shrink-0" />
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-xs font-semibold text-slate-100 truncate group-hover:text-sky-300 transition-colors">
                    {title}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300 capitalize">
                      {actionLabel}
                    </span>
                    <span className="rounded-md border border-slate-800 bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                      {act.media.type}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {formatRelativeTime(act.createdAt)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ProfilePage() {
  const session = useAuthStore((s) => s.session);
  const logoutWeb = useAuthStore((s) => s.logoutWeb);
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const { data: animeList } = useMediaList('ANIME');
  const { data: mangaList } = useMediaList('MANGA');
  const { data: profileDetails, isLoading: profileLoading } = useProfileDetails();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const stats = useMemo(() => {
    const anime = animeList ?? [];
    const manga = mangaList ?? [];

    const episodesWatched = anime.reduce((sum, e) => sum + e.progress, 0);
    const chaptersRead = manga.reduce((sum, e) => sum + e.progress, 0);

    const watchingCount = anime.filter(
      (e) => e.status === 'CURRENT' || e.status === 'REPEATING'
    ).length;
    const readingCount = manga.filter(
      (e) => e.status === 'CURRENT' || e.status === 'REPEATING'
    ).length;

    const scored = [...anime, ...manga].filter((e) => e.score && e.score > 0);
    const meanScore =
      scored.length > 0
        ? Math.round(scored.reduce((s, e) => s + (e.score ?? 0), 0) / scored.length)
        : 0;

    const statusCounts: Record<string, number> = {};
    for (const e of [...anime, ...manga]) {
      statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;
    }

    const genreCounts: Record<string, number> = {};
    for (const e of [...anime, ...manga]) {
      for (const g of e.media.genres) {
        genreCounts[g] = (genreCounts[g] ?? 0) + 1;
      }
    }
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      totalAnime: anime.length,
      totalManga: manga.length,
      watchingCount,
      readingCount,
      episodesWatched,
      chaptersRead,
      meanScore,
      totalEntries: anime.length + manga.length,
      statusCounts,
      topGenres,
    };
  }, [animeList, mangaList]);

  const recentActivities = useMemo(() => {
    if ((profileDetails?.recentActivities?.length ?? 0) > 0) {
      return profileDetails!.recentActivities;
    }
    return synthesizeRecentActivities([...(animeList ?? []), ...(mangaList ?? [])]);
  }, [profileDetails, animeList, mangaList]);

  const heatmapGrid = useMemo(
    () =>
      buildHeatmapData(
        profileDetails?.activityHistory ?? [],
        profileDetails?.recentActivities ?? [],
        [...(animeList ?? []), ...(mangaList ?? [])]
      ),
    [profileDetails, animeList, mangaList]
  );

  const favorites = useMemo(() => {
    const providerAnime = profileDetails?.favorites.anime ?? [];
    const providerManga = profileDetails?.favorites.manga ?? [];
    const providerChars = profileDetails?.favorites.characters ?? [];

    const animeFallback = providerAnime.length === 0;
    const mangaFallback = providerManga.length === 0;

    return {
      anime: animeFallback
        ? buildFallbackFavorites(animeList ?? [], 'ANIME', titleLang)
        : providerAnime,
      manga: mangaFallback
        ? buildFallbackFavorites(mangaList ?? [], 'MANGA', titleLang)
        : providerManga,
      characters: providerChars,
      animeFallback,
      mangaFallback,
    };
  }, [profileDetails, animeList, mangaList, titleLang]);

  const lastActivityMs = recentActivities[0]?.createdAt;
  const activityStatusText =
    stats.watchingCount > 0 || stats.readingCount > 0
      ? `Active · Watching ${stats.watchingCount} anime · Reading ${stats.readingCount} manga`
      : `Synced · ${stats.totalEntries} titles tracked`;

  return (
    <DesktopLayout>
      <div className="space-y-6">
        {/* Header Card with Activity Status */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden">
          {profileDetails?.bannerUrl && (
            <div className="relative h-28 sm:h-36 w-full overflow-hidden">
              <img
                src={profileDetails.bannerUrl}
                alt="Profile banner"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
            </div>
          )}

          <div className="p-6 flex flex-wrap items-center justify-between gap-5">
            <div className="flex flex-wrap items-center gap-5">
              {session?.user.avatarUrl ? (
                <img
                  src={session.user.avatarUrl}
                  alt={session.user.name}
                  className="h-20 w-20 rounded-full object-cover border-2 border-sky-500/40"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-400">
                  {session?.user.name.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold">{session?.user.name}</h1>
                  <span
                    title={session?.provider === 'mal' ? 'MyAnimeList' : 'AniList'}
                    className="inline-flex items-center"
                  >
                    {session?.provider === 'mal' ? (
                      <MalIcon className="h-6 w-6 rounded-md shrink-0" />
                    ) : (
                      <AniListIcon className="h-6 w-6 rounded-md shrink-0" />
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmLogout(true)}
                    title="Sign out"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-300 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
                {profileDetails?.about && (
                  <p className="text-xs text-slate-300 mt-2 max-w-2xl line-clamp-2">
                    {profileDetails.about}
                  </p>
                )}
              </div>
            </div>

            {/* Live Activity Status + Settings */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-300">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="font-medium">{activityStatusText}</span>
                {lastActivityMs && (
                  <span className="font-mono text-[11px] opacity-80 border-l border-emerald-500/30 pl-2">
                    Updated {formatRelativeTime(lastActivityMs)}
                  </span>
                )}
              </div>

              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 hover:border-slate-600 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </Link>
            </div>
          </div>
        </section>

        {/* Stat Tiles */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Tv className="h-3.5 w-3.5 text-sky-400" />
              Anime
            </div>
            <div className="mt-1 text-2xl font-bold font-mono">{stats.totalAnime}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-xs text-slate-400">Episodes Watched</div>
            <div className="mt-1 text-2xl font-bold font-mono text-sky-400">
              {stats.episodesWatched}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              Manga
            </div>
            <div className="mt-1 text-2xl font-bold font-mono">{stats.totalManga}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-xs text-slate-400">Chapters Read</div>
            <div className="mt-1 text-2xl font-bold font-mono text-indigo-400">
              {stats.chaptersRead}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              Mean Score
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-300">
              {stats.meanScore ? `${stats.meanScore}%` : '—'}
            </div>
          </div>
        </section>

        {/* GitHub-Style Activity History Track Bar */}
        <ActivityHeatmapSection grid={heatmapGrid} />

        {/* User Favorites */}
        <FavoritesSection
          animeFavs={favorites.anime}
          mangaFavs={favorites.manga}
          characterFavs={favorites.characters}
          animeFallback={favorites.animeFallback}
          mangaFallback={favorites.mangaFallback}
          isLoading={profileLoading}
        />

        {/* Recent Activity Status Feed */}
        <RecentActivitySection
          activities={recentActivities}
          titleLang={titleLang}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200">
              Status Distribution
            </h2>
            <div className="space-y-3">
              {STATUS_LABELS.map(({ key, label, color }) => {
                const count = stats.statusCounts[key] ?? 0;
                const pct =
                  stats.totalEntries > 0
                    ? Math.round((count / stats.totalEntries) * 100)
                    : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{label}</span>
                      <span className="font-mono text-slate-400">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Top Genres */}
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200">Top Genres</h2>
            {stats.topGenres.length === 0 ? (
              <p className="text-xs text-slate-500">No genre data yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.topGenres.map(([genre, count]) => (
                  <span
                    key={genre}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-200"
                  >
                    {genre}
                    <span className="font-mono text-sky-400">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {confirmLogout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4"
          onClick={() => setConfirmLogout(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl backdrop-blur-xl bg-slate-900/90 border border-white/15 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Sign out of MiruSync?
                </h2>
                <p className="text-xs text-slate-400">
                  You can sign back in anytime with{' '}
                  {session?.provider === 'mal' ? 'MyAnimeList' : 'AniList'}.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="rounded-lg border border-slate-700 hover:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmLogout(false);
                  void logoutWeb();
                }}
                className="rounded-lg bg-rose-500 hover:bg-rose-400 px-4 py-2 text-xs font-semibold text-slate-950 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </DesktopLayout>
  );
}
