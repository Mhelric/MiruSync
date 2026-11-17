import { Link } from 'react-router-dom';
import { Check, Plus, Star } from 'lucide-react';
import { formatMediaTitle, type Media } from '@mirusync/core';

interface DiscoverCardProps {
  media: Media;
  inList: boolean;
  onQuickAdd: (media: Media) => void;
}

export function DiscoverCard({ media, inList, onQuickAdd }: DiscoverCardProps) {
  const title = formatMediaTitle(media, 'romaji');
  const detailPath = `/media/${media.type.toLowerCase()}/${encodeURIComponent(media.id)}`;

  return (
    <div className="group rounded-xl border border-slate-800/80 bg-slate-900/50 hover:border-slate-700 overflow-hidden flex flex-col transition-colors">
      <Link to={detailPath} className="relative aspect-[3/4] bg-slate-900 overflow-hidden">
        <img
          src={media.coverUrl || 'https://placehold.co/300x420/0f172a/64748b?text=No+Cover'}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />
        {media.averageScore ? (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-slate-950/85 backdrop-blur px-2 py-0.5 text-xs font-mono text-amber-300 border border-slate-700/80">
            <Star className="h-3 w-3 fill-amber-300" />
            {media.averageScore}%
          </span>
        ) : null}
        {inList && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-slate-950">
            <Check className="h-3 w-3" />
            In List
          </span>
        )}
      </Link>

      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          <Link
            to={detailPath}
            className="font-medium text-sm text-slate-100 hover:text-sky-400 line-clamp-2 leading-snug"
          >
            {title}
          </Link>
          <p className="mt-1 text-[11px] font-mono text-slate-400">
            {media.format ?? media.type}
            {media.seasonYear ? ` · ${media.seasonYear}` : ''}
          </p>
        </div>

        {inList ? (
          <Link
            to={detailPath}
            className="w-full text-center rounded-lg border border-slate-700 hover:bg-slate-800 py-1.5 text-xs font-medium text-slate-300 transition-colors"
          >
            View Entry
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onQuickAdd(media)}
            className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 py-1.5 text-xs font-semibold text-sky-300 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add to List
          </button>
        )}
      </div>
    </div>
  );
}
