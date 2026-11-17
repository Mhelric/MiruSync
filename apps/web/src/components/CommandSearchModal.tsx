import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import {
  formatMediaTitle,
  useMediaSearch,
  type MediaType,
} from '@mirusync/core';

interface CommandSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function CommandSearchModal({ open, onClose }: CommandSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<MediaType>('ANIME');

  const { data, isFetching } = useMediaSearch(query, {
    type,
    includeAdult: false,
    perPage: 8,
  });

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-sm pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${type.toLowerCase()}…`}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />

          <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setType('ANIME')}
              className={`rounded-md px-2 py-1 cursor-pointer ${
                type === 'ANIME' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              Anime
            </button>
            <button
              type="button"
              onClick={() => setType('MANGA')}
              className={`rounded-md px-2 py-1 cursor-pointer ${
                type === 'MANGA' ? 'bg-indigo-500 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              Manga
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Type a title to search, or{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/search');
                }}
                className="text-sky-400 hover:underline cursor-pointer"
              >
                open full search with filters
              </button>
              .
            </div>
          ) : isFetching ? (
            <div className="p-6 text-center text-xs text-slate-400">Searching…</div>
          ) : (data?.items.length ?? 0) === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No results for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="space-y-1">
              {data!.items.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(
                      `/media/${media.type.toLowerCase()}/${encodeURIComponent(media.id)}`
                    );
                  }}
                  className="w-full flex items-center gap-3 rounded-xl p-2 hover:bg-slate-800/70 text-left transition-colors cursor-pointer"
                >
                  <img
                    src={media.coverUrl || 'https://placehold.co/48x64/0f172a/64748b?text=?'}
                    alt={formatMediaTitle(media)}
                    className="h-12 w-9 rounded-md object-cover bg-slate-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-100 truncate">
                      {formatMediaTitle(media)}
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      {media.format ?? media.type}
                      {media.seasonYear ? ` · ${media.seasonYear}` : ''}
                      {media.averageScore ? ` · ${media.averageScore}%` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
