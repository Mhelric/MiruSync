import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutGrid,
  List as ListIcon,
  Pencil,
  Plus,
  Rows3,
  Search,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import {
  formatMediaTitle,
  useAuthStore,
  useDeleteEntry,
  useLocalPrefsStore,
  useMediaList,
  useSettingsStore,
  useUpdateEntry,
  type ListEntry,
  type ListStatus,
  type MediaType,
} from '@mirusync/core';
import { MobileLayout } from '../layouts/MobileLayout';
import { MobileEditEntryModal } from '../components/MobileEditEntryModal';
import { API_BASE } from '../lib/mobileAuth';

type SortKey = 'updated' | 'score' | 'title' | 'progress' | 'airing';
type LayoutMode = 'grid' | 'list' | 'compact';

const STATUS_TABS: { key: ListStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CURRENT', label: 'Current' },
  { key: 'PLANNING', label: 'Plan' },
  { key: 'COMPLETED', label: 'Done' },
  { key: 'PAUSED', label: 'Hold' },
  { key: 'DROPPED', label: 'Dropped' },
];

export function MobileTrackerPage({ type }: { type: MediaType }) {
  const session = useAuthStore((s) => s.session);
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const showAdult = useSettingsStore((s) => s.settings.show_adult);
  const shortTitles = useLocalPrefsStore((s) => s.shortTitles);
  const defaultLayout = useSettingsStore((s) => s.settings.list_layout);

  const [status, setStatus] = useState<ListStatus | 'ALL'>('CURRENT');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('updated');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [genreFilter, setGenreFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [layout, setLayout] = useState<LayoutMode>(defaultLayout);
  const [editing, setEditing] = useState<ListEntry | null>(null);

  const { data: entries, isLoading } = useMediaList(type, undefined, API_BASE);
  const updateEntry = useUpdateEntry(API_BASE);
  const deleteEntry = useDeleteEntry(API_BASE);

  const availableFormats = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries ?? []) {
      if (e.media.format) set.add(e.media.format);
    }
    return Array.from(set).sort();
  }, [entries]);

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries ?? []) {
      for (const g of e.media.genres ?? []) set.add(g);
    }
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (entries ?? []).filter((e) => {
      if (!showAdult && e.media.isAdult) return false;
      if (status !== 'ALL' && e.status !== status) return false;
      if (formatFilter !== 'ALL' && e.media.format !== formatFilter) return false;
      if (genreFilter !== 'ALL' && !e.media.genres?.includes(genreFilter)) return false;
      if (q) {
        const t = formatMediaTitle(e.media, titleLang).toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'score') return (b.score ?? 0) - (a.score ?? 0);
      if (sortBy === 'progress') return b.progress - a.progress;
      if (sortBy === 'title') {
        return formatMediaTitle(a.media, titleLang).localeCompare(
          formatMediaTitle(b.media, titleLang)
        );
      }
      if (sortBy === 'airing') {
        const aAir = a.media.nextAiring?.airingAt ?? Number.MAX_SAFE_INTEGER;
        const bAir = b.media.nextAiring?.airingAt ?? Number.MAX_SAFE_INTEGER;
        return aAir - bAir;
      }
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    });
  }, [entries, showAdult, status, formatFilter, genreFilter, search, sortBy, titleLang]);

  function resolveMediaId(item: { id: string; malId?: number }) {
    if (session?.provider === 'mal' && item.malId) {
      return `mal:${item.malId}`;
    }
    return item.id;
  }

  function handleIncrement(entry: ListEntry) {
    const max = type === 'ANIME' ? entry.media.episodes : entry.media.chapters;
    const nextProgress = entry.progress + 1;
    updateEntry.mutate({
      mediaId: entry.media.id,
      type,
      progress: nextProgress,
      status: max && nextProgress >= max ? 'COMPLETED' : entry.status,
    });
  }

  return (
    <MobileLayout title={type === 'ANIME' ? 'Anime' : 'Manga'}>
      <div className="space-y-4">
        {/* Search + Filter Toggle Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${type.toLowerCase()} list…`}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/70 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
              showFilters || formatFilter !== 'ALL' || genreFilter !== 'ALL'
                ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                : 'border-slate-800 bg-slate-900/70 text-slate-300'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>
        </div>

        {/* Smooth Expanding Filter Drawer */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            showFilters ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-2 text-xs text-slate-200"
                >
                  <option value="ALL">All Formats</option>
                  {availableFormats.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-2 text-xs text-slate-200"
                >
                  <option value="ALL">All Genres</option>
                  {availableGenres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-2 text-xs text-slate-200"
                >
                  <option value="updated">Sort: Recently Updated</option>
                  <option value="score">Sort: Highest Score</option>
                  <option value="progress">Sort: Most Progress</option>
                  <option value="title">Sort: Title (A–Z)</option>
                  <option value="airing">Sort: Airing Soon</option>
                </select>

                <div className="flex rounded-xl border border-slate-800 bg-slate-950/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => setLayout('grid')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      layout === 'grid' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
                    }`}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayout('list')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      layout === 'list' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
                    }`}
                    aria-label="List view"
                  >
                    <ListIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayout('compact')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      layout === 'compact' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
                    }`}
                    aria-label="Compact view"
                  >
                    <Rows3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Scrollable Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_TABS.map((t) => {
            const label =
              t.key === 'CURRENT'
                ? type === 'ANIME'
                  ? 'Watching'
                  : 'Reading'
                : t.label;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatus(t.key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  status === t.key
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'border border-slate-800 bg-slate-900/60 text-slate-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Entries */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center text-xs text-slate-400">
            No titles match your filters.
          </div>
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((entry) => {
              const total = type === 'ANIME' ? entry.media.episodes : entry.media.chapters;
              const unit = type === 'ANIME' ? 'Ep' : 'Ch';
              const pct = total
                ? Math.min(100, Math.round((entry.progress / total) * 100))
                : 0;
              const canInc = !total || entry.progress < total;

              return (
                <div
                  key={entry.media.id}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden flex flex-col"
                >
                  <Link
                    to={`/media/${type.toLowerCase()}/${encodeURIComponent(
                      resolveMediaId(entry.media)
                    )}`}
                    className="relative aspect-[2/3] bg-slate-900 block"
                  >
                    <img
                      src={
                        entry.media.coverUrl ||
                        'https://placehold.co/240x360/0f172a/64748b?text=?'
                      }
                      alt={formatMediaTitle(entry.media, titleLang, shortTitles)}
                      className="h-full w-full object-cover"
                    />
                    {entry.score ? (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 rounded-lg bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                        <Star className="h-2.5 w-2.5 fill-amber-300" />
                        {entry.score}
                      </span>
                    ) : null}
                  </Link>

                  <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <Link
                        to={`/media/${type.toLowerCase()}/${encodeURIComponent(
                          resolveMediaId(entry.media)
                        )}`}
                        className="text-xs font-semibold text-slate-100 line-clamp-2 leading-snug"
                      >
                        {formatMediaTitle(entry.media, titleLang, shortTitles)}
                      </Link>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        {unit} {entry.progress} / {total ?? '?'}
                      </div>
                      {total && (
                        <div className="h-1 rounded-full bg-slate-800 overflow-hidden mt-1">
                          <div
                            className="h-full bg-sky-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {canInc && (
                        <button
                          type="button"
                          onClick={() => handleIncrement(entry)}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500/15 border border-sky-500/30 py-1.5 text-[11px] font-semibold text-sky-300 active:scale-95 transition-transform cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />1 {unit}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing(entry)}
                        aria-label="Edit entry"
                        className="rounded-lg border border-slate-800 bg-slate-950/60 p-1.5 text-slate-300 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : layout === 'list' ? (
          <div className="space-y-2.5">
            {filtered.map((entry) => {
              const total = type === 'ANIME' ? entry.media.episodes : entry.media.chapters;
              const unit = type === 'ANIME' ? 'Ep' : 'Ch';
              const canInc = !total || entry.progress < total;

              return (
                <div
                  key={entry.media.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-2.5"
                >
                  <Link
                    to={`/media/${type.toLowerCase()}/${encodeURIComponent(
                      resolveMediaId(entry.media)
                    )}`}
                    className="shrink-0"
                  >
                    <img
                      src={
                        entry.media.coverUrl ||
                        'https://placehold.co/60x84/0f172a/64748b?text=?'
                      }
                      alt={formatMediaTitle(entry.media, titleLang, shortTitles)}
                      className="h-16 w-12 rounded-xl object-cover bg-slate-800"
                    />
                  </Link>

                  <Link
                    to={`/media/${type.toLowerCase()}/${encodeURIComponent(
                      resolveMediaId(entry.media)
                    )}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="text-xs font-semibold text-slate-100 line-clamp-2">
                      {formatMediaTitle(entry.media, titleLang, shortTitles)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-1">
                      {unit} {entry.progress} / {total ?? '?'}
                      {entry.score ? ` · ★ ${entry.score}` : ''}
                    </div>
                  </Link>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {canInc && (
                      <button
                        type="button"
                        onClick={() => handleIncrement(entry)}
                        className="inline-flex items-center gap-1 rounded-xl bg-sky-500/15 border border-sky-500/30 px-2.5 py-2 text-xs font-semibold text-sky-300 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />1
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(entry)}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-slate-300 cursor-pointer"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800/80 bg-slate-900/50 overflow-hidden">
            {filtered.map((entry) => {
              const total = type === 'ANIME' ? entry.media.episodes : entry.media.chapters;
              const canInc = !total || entry.progress < total;

              return (
                <div
                  key={entry.media.id}
                  className="flex items-center justify-between gap-2 px-3 py-2.5"
                >
                  <Link
                    to={`/media/${type.toLowerCase()}/${encodeURIComponent(
                      resolveMediaId(entry.media)
                    )}`}
                    className="min-w-0 flex-1 text-xs font-medium text-slate-100 truncate"
                  >
                    {formatMediaTitle(entry.media, titleLang, shortTitles)}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">
                      {entry.progress}/{total ?? '?'}
                    </span>
                    {canInc && (
                      <button
                        type="button"
                        onClick={() => handleIncrement(entry)}
                        className="rounded-lg bg-sky-500/15 border border-sky-500/30 px-2 py-1 text-[11px] font-semibold text-sky-300 cursor-pointer"
                      >
                        +1
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(entry)}
                      className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <MobileEditEntryModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(update) => updateEntry.mutate(update)}
          onDelete={(mediaId) => deleteEntry.mutate({ mediaId, type })}
        />
      )}
    </MobileLayout>
  );
}
