import { useMemo, useState } from 'react';
import { LayoutGrid, List, Search } from 'lucide-react';
import {
  formatMediaTitle,
  useAuthStore,
  useDeleteEntry,
  useMediaList,
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

type SortKey = 'updated' | 'title' | 'score' | 'progress';

export function TrackerPage({ type }: { type: MediaType }) {
  const session = useAuthStore((s) => s.session);
  const { data: entries, isLoading, isError, error, refetch } = useMediaList(type);
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  const [activeStatus, setActiveStatus] = useState<ListStatus | 'ALL'>('CURRENT');
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('updated');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [editing, setEditing] = useState<ListEntry | null>(null);

  const filtered = useMemo(() => {
    const list = (entries ?? []).filter((e) => !e.media.isAdult);
    const byStatus =
      activeStatus === 'ALL' ? list : list.filter((e) => e.status === activeStatus);

    const q = filterText.trim().toLowerCase();
    const byQuery = q
      ? byStatus.filter((e) =>
          formatMediaTitle(e.media, 'romaji').toLowerCase().includes(q)
        )
      : byStatus;

    return [...byQuery].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return formatMediaTitle(a.media).localeCompare(formatMediaTitle(b.media));
        case 'score':
          return (b.score ?? 0) - (a.score ?? 0);
        case 'progress':
          return b.progress - a.progress;
        case 'updated':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });
  }, [entries, activeStatus, filterText, sortBy]);

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

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter list…"
                className="rounded-lg border border-slate-800 bg-slate-900/70 pl-8 pr-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 w-48"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="updated">Last Updated</option>
              <option value="title">Title</option>
              <option value="score">Score</option>
              <option value="progress">Progress</option>
            </select>

            <div className="flex rounded-lg border border-slate-800 bg-slate-900/70 p-0.5">
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
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-800/80 pb-3">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveStatus(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
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
          <div className="space-y-2.5">
            {filtered.map((entry) => (
              <MediaCard
                key={entry.media.id}
                entry={entry}
                layout="list"
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
