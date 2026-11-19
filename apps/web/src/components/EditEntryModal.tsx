import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import {
  formatMediaTitle,
  type EntryUpdate,
  type ListEntry,
  type ListStatus,
} from '@mirusync/core';

interface EditEntryModalProps {
  entry: ListEntry;
  onClose: () => void;
  onSave: (update: EntryUpdate) => void;
  onDelete: (mediaId: string) => void;
}

const STATUS_OPTIONS: { value: ListStatus; label: string }[] = [
  { value: 'CURRENT', label: 'Watching / Reading' },
  { value: 'PLANNING', label: 'Plan to Watch / Read' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PAUSED', label: 'On Hold' },
  { value: 'DROPPED', label: 'Dropped' },
  { value: 'REPEATING', label: 'Rewatching / Rereading' },
];

export function EditEntryModal({
  entry,
  onClose,
  onSave,
  onDelete,
}: EditEntryModalProps) {
  const { media } = entry;
  const [status, setStatus] = useState<ListStatus>(entry.status);
  const [progress, setProgress] = useState<number>(entry.progress);
  const [progressVolumes, setProgressVolumes] = useState<number>(
    entry.progressVolumes ?? 0
  );
  const [score10, setScore10] = useState<number>(
    entry.score ? Math.round(entry.score / 10) : 0
  );
  const [startedAt, setStartedAt] = useState<string>(entry.startedAt ?? '');
  const [completedAt, setCompletedAt] = useState<string>(entry.completedAt ?? '');
  const [repeat, setRepeat] = useState<number>(entry.repeat ?? 0);
  const [notes, setNotes] = useState<string>(entry.notes ?? '');

  const maxProgress = media.type === 'ANIME' ? media.episodes : media.chapters;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      mediaId: media.id,
      type: media.type,
      status,
      progress,
      progressVolumes: media.type === 'MANGA' ? progressVolumes : undefined,
      score: score10 * 10,
      startedAt: startedAt || undefined,
      completedAt: completedAt || undefined,
      repeat,
      notes: notes || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-mono uppercase text-sky-400">
              Edit {media.type}
            </p>
            <h2 className="text-lg font-bold text-slate-50 line-clamp-1">
              {formatMediaTitle(media, 'romaji')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ListStatus)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Score (0–10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={score10}
                onChange={(e) => setScore10(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {media.type === 'ANIME' ? 'Episodes Watched' : 'Chapters Read'}
                {maxProgress ? ` (max ${maxProgress})` : ''}
              </label>
              <input
                type="number"
                min={0}
                max={maxProgress ?? undefined}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            {media.type === 'MANGA' ? (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Volumes Read
                </label>
                <input
                  type="number"
                  min={0}
                  max={media.volumes ?? undefined}
                  value={progressVolumes}
                  onChange={(e) => setProgressVolumes(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Rewatches
                </label>
                <input
                  type="number"
                  min={0}
                  value={repeat}
                  onChange={(e) => setRepeat(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Finish Date
              </label>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                onDelete(media.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-300 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
