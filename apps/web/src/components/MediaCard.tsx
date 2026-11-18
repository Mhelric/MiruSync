import { Link } from 'react-router-dom';
import { Edit3, Plus, Star } from 'lucide-react';
import {
  formatMediaTitle,
  formatScore,
  useLocalPrefsStore,
  useSettingsStore,
  type ListEntry,
  type ScoreFormat,
} from '@mirusync/core';

interface MediaCardProps {
  entry: ListEntry;
  layout?: 'grid' | 'list' | 'compact';
  scoreFormat?: ScoreFormat;
  onIncrement: (entry: ListEntry) => void;
  onEdit: (entry: ListEntry) => void;
}

export function MediaCard({
  entry,
  layout = 'grid',
  scoreFormat = 'POINT_10',
  onIncrement,
  onEdit,
}: MediaCardProps) {
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const scoreFormatOverride = useLocalPrefsStore((s) => s.scoreFormatOverride);
  const effectiveScoreFormat =
    scoreFormatOverride === 'ACCOUNT' ? scoreFormat : scoreFormatOverride;

  const { media } = entry;
  const title = formatMediaTitle(media, titleLang);
  const total = media.type === 'ANIME' ? media.episodes : media.chapters;
  const unit = media.type === 'ANIME' ? 'Ep' : 'Ch';
  const pct = total && total > 0 ? Math.min(100, Math.round((entry.progress / total) * 100)) : 0;
  const canIncrement = !total || entry.progress < total;
  const detailPath = `/media/${media.type.toLowerCase()}/${encodeURIComponent(media.id)}`;

  if (layout === 'compact') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/70 bg-slate-900/40 hover:border-slate-700 px-3 py-2 transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            to={detailPath}
            className="text-xs font-medium text-slate-100 hover:text-sky-400 truncate"
          >
            {title}
          </Link>
          {media.format && (
            <span className="hidden sm:inline rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 shrink-0">
              {media.format}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs font-mono text-slate-300">
            {unit} {entry.progress}/{total ?? '?'}
          </span>
          {entry.score ? (
            <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono text-amber-300">
              <Star className="h-2.5 w-2.5 fill-amber-300" />
              {formatScore(entry.score, effectiveScoreFormat)}
            </span>
          ) : null}
          {canIncrement && (
            <button
              type="button"
              onClick={() => onIncrement(entry)}
              className="inline-flex items-center gap-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 px-2 py-1 text-[11px] font-semibold text-sky-300 cursor-pointer"
            >
              <Plus className="h-3 w-3" />1
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(entry)}
            title="Edit entry"
            className="rounded border border-slate-700 hover:border-slate-600 bg-slate-800/80 p-1 text-slate-300 hover:text-white cursor-pointer"
          >
            <Edit3 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:border-slate-700 p-3 transition-colors">
        <Link to={detailPath} className="shrink-0">
          <img
            src={media.coverUrl || 'https://placehold.co/80x112/0f172a/64748b?text=No+Cover'}
            alt={title}
            loading="lazy"
            className="h-16 w-12 rounded-lg object-cover bg-slate-800"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            to={detailPath}
            className="font-medium text-sm text-slate-100 hover:text-sky-400 truncate block"
          >
            {title}
          </Link>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>
              {unit} {entry.progress} / {total ?? '?'}
            </span>
            {media.format && <span>{media.format}</span>}
          </div>
          <div className="mt-1.5 h-1.5 w-full max-w-xs rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {entry.score ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs font-mono text-amber-300">
              <Star className="h-3 w-3 fill-amber-300" />
              {formatScore(entry.score, effectiveScoreFormat)}
            </span>
          ) : null}

          {canIncrement && (
            <button
              type="button"
              onClick={() => onIncrement(entry)}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 px-2.5 py-1.5 text-xs font-semibold text-sky-300 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />1
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(entry)}
            title="Edit entry"
            className="rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/80 p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-xl border border-slate-800/80 bg-slate-900/50 hover:border-slate-700 overflow-hidden flex flex-col transition-colors">
      <Link to={detailPath} className="relative aspect-[3/4] bg-slate-900 overflow-hidden">
        <img
          src={media.coverUrl || 'https://placehold.co/300x420/0f172a/64748b?text=No+Cover'}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />
        {entry.score ? (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-slate-950/85 backdrop-blur px-2 py-0.5 text-xs font-mono text-amber-300 border border-slate-700/80">
            <Star className="h-3 w-3 fill-amber-300" />
            {formatScore(entry.score, effectiveScoreFormat)}
          </span>
        ) : null}
      </Link>

      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
        <div>
          <Link
            to={detailPath}
            className="font-medium text-sm text-slate-100 hover:text-sky-400 line-clamp-2 leading-snug"
          >
            {title}
          </Link>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
            <span>
              {unit} {entry.progress} / {total ?? '?'}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mb-2.5">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {canIncrement && (
              <button
                type="button"
                onClick={() => onIncrement(entry)}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 py-1.5 text-xs font-semibold text-sky-300 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />1 {unit}
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(entry)}
              title="Edit entry"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
