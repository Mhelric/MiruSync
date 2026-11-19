import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shuffle, Star, X } from 'lucide-react';
import {
  formatMediaTitle,
  useSettingsStore,
  type ListEntry,
  type ListStatus,
  type MediaType,
} from '@mirusync/core';

interface RandomPickerModalProps {
  open: boolean;
  onClose: () => void;
  entries: ListEntry[];
  defaultType?: MediaType | 'ALL';
}

export function RandomPickerModal({
  open,
  onClose,
  entries,
  defaultType = 'ALL',
}: RandomPickerModalProps) {
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const showAdult = useSettingsStore((s) => s.settings.show_adult);

  const [typeFilter, setTypeFilter] = useState<MediaType | 'ALL'>(defaultType);
  const [statusFilter, setStatusFilter] = useState<ListStatus | 'ALL'>('PLANNING');
  const [genreFilter, setGenreFilter] = useState('');
  const [picked, setPicked] = useState<ListEntry | null>(null);

  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (!showAdult && e.media.isAdult) continue;
      for (const g of e.media.genres) set.add(g);
    }
    return [...set].sort();
  }, [entries, showAdult]);

  const pool = useMemo(() => {
    return entries.filter((e) => {
      if (!showAdult && e.media.isAdult) return false;
      if (typeFilter !== 'ALL' && e.media.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (genreFilter && !e.media.genres.includes(genreFilter)) return false;
      return true;
    });
  }, [entries, showAdult, typeFilter, statusFilter, genreFilter]);

  function pickRandom(currentId?: string) {
    if (pool.length === 0) {
      setPicked(null);
      return;
    }
    const candidates =
      pool.length > 1 && currentId
        ? pool.filter((e) => e.media.id !== currentId)
        : pool;
    const idx = Math.floor(Math.random() * candidates.length);
    setPicked(candidates[idx] ?? null);
  }

  useEffect(() => {
    if (!open) return;
    setTypeFilter(defaultType);
    const initialPool = entries.filter((e) => {
      if (!showAdult && e.media.isAdult) return false;
      if (defaultType !== 'ALL' && e.media.type !== defaultType) return false;
      return e.status === 'PLANNING';
    });
    const fallbackPool =
      initialPool.length > 0
        ? initialPool
        : entries.filter(
            (e) =>
              (showAdult || !e.media.isAdult) &&
              (defaultType === 'ALL' || e.media.type === defaultType)
          );
    if (initialPool.length === 0) setStatusFilter('ALL');
    else setStatusFilter('PLANNING');

    if (fallbackPool.length > 0) {
      setPicked(fallbackPool[Math.floor(Math.random() * fallbackPool.length)]);
    } else {
      setPicked(null);
    }
  }, [open, defaultType, entries, showAdult]);

  if (!open) return null;

  const pickedTitle = picked ? formatMediaTitle(picked.media, titleLang) : '';
  const detailPath = picked
    ? `/media/${picked.media.type.toLowerCase()}/${encodeURIComponent(picked.media.id)}`
    : '/';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100">
              What should I watch / read?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MediaType | 'ALL')}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">Anime &amp; Manga</option>
            <option value="ANIME">Anime Only</option>
            <option value="MANGA">Manga Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ListStatus | 'ALL')}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="PLANNING">Plan to Watch/Read</option>
            <option value="CURRENT">Watching/Reading</option>
            <option value="ALL">Any Status</option>
          </select>

          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="">Any Genre</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Result */}
        {!picked ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center text-xs text-slate-400">
            No titles match these filters ({pool.length} available). Try widening your filters.
          </div>
        ) : (
          <div className="flex gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <img
              src={
                picked.media.coverUrl ||
                'https://placehold.co/160x220/0f172a/64748b?text=No+Cover'
              }
              alt={pickedTitle}
              className="h-36 w-24 rounded-lg object-cover shrink-0 bg-slate-800"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-100 line-clamp-2">
                  {pickedTitle}
                </h3>
                {picked.media.averageScore && (
                  <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono text-amber-300 shrink-0">
                    <Star className="h-3 w-3 fill-amber-300" />
                    {picked.media.averageScore}%
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-400">
                <span>{picked.media.type}</span>
                {picked.media.format && <span>· {picked.media.format}</span>}
                {picked.media.episodes && <span>· {picked.media.episodes} eps</span>}
                {picked.media.chapters && <span>· {picked.media.chapters} chs</span>}
              </div>

              {picked.media.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {picked.media.genres.slice(0, 4).map((g) => (
                    <span
                      key={g}
                      className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {picked.media.synopsis && (
                <p className="text-xs text-slate-400 line-clamp-2">
                  {picked.media.synopsis.replace(/<[^>]+>/g, '')}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-slate-400">
            {pool.length} matching {pool.length === 1 ? 'title' : 'titles'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => pickRandom(picked?.media.id)}
              disabled={pool.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-40 px-3.5 py-2 text-xs font-medium text-slate-200 cursor-pointer"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Pick Another
            </button>
            {picked && (
              <Link
                to={detailPath}
                onClick={onClose}
                className="rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950"
              >
                Open Details
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
