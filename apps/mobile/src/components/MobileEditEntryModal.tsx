import { useState } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import {
  formatMediaTitle,
  useLocalPrefsStore,
  useSettingsStore,
  type EntryUpdate,
  type ListEntry,
  type ListStatus,
} from '@mirusync/core';

const ANIME_STATUSES: { key: ListStatus; label: string }[] = [
  { key: 'CURRENT', label: 'Watching' },
  { key: 'PLANNING', label: 'Plan to Watch' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'PAUSED', label: 'On Hold' },
  { key: 'DROPPED', label: 'Dropped' },
];

const MANGA_STATUSES: { key: ListStatus; label: string }[] = [
  { key: 'CURRENT', label: 'Reading' },
  { key: 'PLANNING', label: 'Plan to Read' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'PAUSED', label: 'On Hold' },
  { key: 'DROPPED', label: 'Dropped' },
];

export function MobileEditEntryModal({
  entry,
  onClose,
  onSave,
  onDelete,
}: {
  entry: ListEntry;
  onClose: () => void;
  onSave: (update: EntryUpdate) => void;
  onDelete: (mediaId: string) => void;
}) {
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const shortTitles = useLocalPrefsStore((s) => s.shortTitles);
  const [status, setStatus] = useState<ListStatus>(entry.status);
  const [progress, setProgress] = useState<number>(entry.progress);
  const [score, setScore] = useState<number>(entry.score ?? 0);

  const isAnime = entry.media.type === 'ANIME';
  const maxTotal = isAnime ? entry.media.episodes : entry.media.chapters;
  const statuses = isAnime ? ANIME_STATUSES : MANGA_STATUSES;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      mediaId: entry.media.id,
      type: entry.media.type,
      status,
      progress: Math.max(0, maxTotal ? Math.min(progress, maxTotal) : progress),
      score: score > 0 ? score : undefined,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-white/15 bg-slate-900 p-4 sm:p-5 pb-8 shadow-2xl space-y-4 sm:space-y-5"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-700" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase text-sky-400">
              Edit {isAnime ? 'Anime' : 'Manga'} Entry
            </div>
            <h3 className="text-base font-bold text-slate-100 line-clamp-2 mt-0.5">
              {formatMediaTitle(entry.media, titleLang, shortTitles)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Status</label>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStatus(s.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  status === s.key
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'border border-slate-800 bg-slate-950/60 text-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Stepper + Score */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              {isAnime ? 'Episodes' : 'Chapters'} {maxTotal ? `/ ${maxTotal}` : ''}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setProgress((p) => Math.max(0, p - 1))}
                className="h-10 w-10 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-center text-slate-200 cursor-pointer"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min={0}
                max={maxTotal ?? undefined}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value) || 0)}
                className="w-full h-10 rounded-xl border border-slate-800 bg-slate-950/60 text-center text-sm font-mono text-slate-100"
              />
              <button
                type="button"
                onClick={() =>
                  setProgress((p) => (maxTotal ? Math.min(maxTotal, p + 1) : p + 1))
                }
                className="h-10 w-10 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-center text-slate-200 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Score (0–10)
            </label>
            <input
              type="number"
              min={0}
              max={10}
              step={1}
              value={score}
              onChange={(e) => setScore(Math.min(10, Math.max(0, Number(e.target.value) || 0)))}
              className="w-full h-10 rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm font-mono text-slate-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              onDelete(entry.media.id);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-300 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>

          <button
            type="submit"
            className="flex-1 rounded-xl bg-sky-500 hover:bg-sky-400 py-2.5 px-4 text-sm font-semibold text-slate-950 cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
