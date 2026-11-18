import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List, Rows3, Search, SlidersHorizontal } from 'lucide-react';
import {
  formatMediaTitle,
  useAuthStore,
  useDeleteEntry,
  useMediaList,
  useSettingsStore,
  useUpdateEntry,
  type ListEntry,
  type ListStatus,
  type MediaType,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';
import { MediaCard } from '../components/MediaCard';
import { EditEntryModal } from '../components/EditEntryModal';

const STATUS_TABS: { key: ListStatus | 'ALL'; animeLabel: string; mangaLabel: string }[] = [
  { key: 'ALL', animeLabel: 'All', mangaLabel: 'All' },
  { key: 'CURRENT', animeLabel: 'Watching', mangaLabel: 'Reading' },
  { key: 'PLANNING', animeLabel: 'Plan to Watch', mangaLabel: 'Plan to Read' },
  { key: 'COMPLETED', animeLabel: 'Completed', mangaLabel: 'Completed' },
  { key: 'PAUSED', animeLabel: 'On Hold', mangaLabel: 'On Hold' },
  { key: 'DROPPED', animeLabel: 'Dropped', mangaLabel: 'Dropped' },
];

type SortKey = 'updated' | 'title' | 'score' | 'progress' | 'airing';

export function TrackerPage({ type }: { type: MediaType }) {
  const session = useAuthStore((s) => s.session);
  const defaultLayout = useSettingsStore((s) => s.settings.list_layout);
  const showAdult = useSettingsStore((s) => s.settings.show_adult);
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const { data: entries, isLoading, isError, error, refetch } = useMediaList(type);
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  const [activeStatus, setActiveStatus] = useState<ListStatus | 'ALL'>('CURRENT');
  const [filterText, setFilterText] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('updated');
  const [layout, setLayout] = useState<'grid' | 'list' | 'compact'>(defaultLayout);
  const [editing, setEditing] = useState<ListEntry | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount =
    (formatFilter ? 1 : 0) +
    (genreFilter ? 1 : 0) +
    (yearFilter ? 1 : 0) +
    (sortBy !== 'updated' ? 1 : 0);

  useEffect(() => {
    setLayout(defaultLayout);
  }, [defaultLayout]);

  const { availableFormats, availableGenres, availableYears } = useMemo(() => {
    const formats = new Set<string>();
    const genres = new Set<string>();
    const years = new Set<number>();
    for (const e of entries ?? []) {
      if (!showAdult && e.media.isAdult) continue;
      if (e.media.format) formats.add(e.media.format);
      for (const g of e.media.genres) genres.add(g);
      if (e.media.seasonYear) years.add(e.media.seasonYear);
    }
    return {
      availableFormats: [...formats].sort(),
      availableGenres: [...genres].sort(),
      availableYears: [...years].sort((a, b) => b - a),
    };
  }, [entries, showAdult]);

  const filtered = useMemo(() => {
    const list = (entries ?? []).filter((e) => showAdult || !e.media.isAdult);
    const byStatus =
      activeStatus === 'ALL' ? list : list.filter((e) => e.status === activeStatus);

    const q = filterText.trim().toLowerCase();
    const byFilters = byStatus.filter((e) => {
      if (q && !formatMediaTitle(e.media, titleLang).toLowerCase().includes(q)) {
        return false;
      }
      if (formatFilter && e.media.format !== formatFilter) return false;
      if (genreFilter && !e.media.genres.includes(genreFilter)) return false;
      if (yearFilter && e.media.seasonYear !== Number(yearFilter)) return false;
      return true;
    });

    return [...byFilters].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return formatMediaTitle(a.media, titleLang).localeCompare(
            formatMediaTitle(b.media, titleLang)
          );
        case 'score':
          return (b.score ?? 0) - (a.score ?? 0);
        case 'progress':
          return b.progress - a.progress;
        case 'airing': {
          const aTime = a.media.nextAiring?.airingAt ?? Number.MAX_SAFE_INTEGER;
          const bTime = b.media.nextAiring?.airingAt ?? Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        }
        case 'updated':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });
  }, [
    entries,
    showAdult,
    activeStatus,
    filterText,
    formatFilter,
    genreFilter,
    yearFilter,
    sortBy,
    titleLang,
  ]);

  function handleIncrement(entry: ListEntry) {
    const max = type === 'ANIME' ? entry.media.episodes : entry.media.chapters;
    const nextProgress = entry.progress + 1;
    const nextStatus =
      max && nextProgress >= max ? 'COMPLETED' : entry.status;

    updateEntry.mutate({
      mediaId: entry.media.id,
      type,
      progress: nextProgress,
      status: nextStatus,
    });
  }

  return (
    <DesktopLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {type === 'ANIME' ? 'Anime Tracker' : 'Manga Tracker'}
            </h1>
            <p className="text-sm text-slate-400">
              {entries ? `${entries.length} titles in your list` : 'Loading your list…'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter list…"
                className="w-full sm:w-48 rounded-lg border border-slate-800 bg-slate-900/70 pl-8 pr-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                filtersOpen || activeFilterCount > 0
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                  : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-sky-500 px-1.5 py-0.2 text-[10px] font-bold text-slate-950">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex rounded-lg border border-slate-800 bg-slate-900/70 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setLayout('grid')}
                className={`rounded-md p-1.5 cursor-pointer ${
                  layout === 'grid' ? 'bg-slate-800 text-sky-400' : 'text-slate-400'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayout('list')}
                className={`rounded-md p-1.5 cursor-pointer ${
                  layout === 'list' ? 'bg-slate-800 text-sky-400' : 'text-slate-400'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayout('compact')}
                className={`rounded-md p-1.5 cursor-pointer ${
                  layout === 'compact' ? 'bg-slate-800 text-sky-400' : 'text-slate-400'
                }`}
                title="Compact view"
              >
                <Rows3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {filtersOpen && (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="">All Formats</option>
              {availableFormats.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="">All Genres</option>
              {availableGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="updated">Sort: Last Updated</option>
              <option value="title">Sort: Title</option>
              <option value="score">Sort: Score</option>
              <option value="progress">Sort: Progress</option>
              {type === 'ANIME' && <option value="airing">Sort: Airing Soon</option>}
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFormatFilter('');
                  setGenreFilter('');
                  setYearFilter('');
                  setSortBy('updated');
                }}
                className="col-span-2 sm:col-span-4 text-left text-[11px] text-sky-400 hover:underline cursor-pointer px-1"
              >
                Reset filters
              </button>
            )}
          </div>
        )}

        {/* Status Tabs */}
        <div className="flex flex-nowrap overflow-x-auto sm:flex-wrap gap-1.5 border-b border-slate-800/80 pb-3">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveStatus(tab.key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                activeStatus === tab.key
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {type === 'ANIME' ? tab.animeLabel : tab.mangaLabel}
            </button>
          ))}
        </div>

        {/* States */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-xl bg-slate-900/80 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <p className="text-sm text-rose-300">
              Failed to load list: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 px-4 py-1.5 text-xs font-medium text-rose-200 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center">
            <p className="text-sm text-slate-400">No titles match this filter.</p>
          </div>
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((entry) => (
              <MediaCard
                key={entry.media.id}
                entry={entry}
                layout="grid"
                scoreFormat={session?.user.scoreFormat}
                onIncrement={handleIncrement}
                onEdit={setEditing}
              />
            ))}
          </div>
        ) : (
          <div className={layout === 'compact' ? 'space-y-1.5' : 'space-y-2.5'}>
            {filtered.map((entry) => (
              <MediaCard
                key={entry.media.id}
                entry={entry}
                layout={layout}
                scoreFormat={session?.user.scoreFormat}
                onIncrement={handleIncrement}
                onEdit={setEditing}
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditEntryModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(update) => updateEntry.mutate(update)}
          onDelete={(mediaId) => deleteEntry.mutate({ mediaId, type })}
        />
      )}
    </DesktopLayout>
  );
}
