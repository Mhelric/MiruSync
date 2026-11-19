import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Search, Star, Tv, X } from 'lucide-react';
import {
  formatMediaTitle,
  useAuthStore,
  useLocalPrefsStore,
  useMediaList,
  useMediaSearch,
  useSettingsStore,
  type Media,
  type MediaType,
} from '@mirusync/core';
import { API_BASE } from '../lib/mobileAuth';

export function MobileQuickSearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const showAdult = useSettingsStore((s) => s.settings.show_adult);
  const shortTitles = useLocalPrefsStore((s) => s.shortTitles);

  const [query, setQuery] = useState('');
  const [type, setType] = useState<MediaType>('ANIME');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: animeList } = useMediaList('ANIME', undefined, API_BASE);
  const { data: mangaList } = useMediaList('MANGA', undefined, API_BASE);

  const { data: remoteRes, isFetching } = useMediaSearch(
    query,
    { type, includeAdult: showAdult, perPage: 10 },
    API_BASE
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const source = type === 'ANIME' ? animeList ?? [] : mangaList ?? [];
    return source
      .filter((e) => formatMediaTitle(e.media, titleLang).toLowerCase().includes(q))
      .slice(0, 4);
  }, [query, type, animeList, mangaList, titleLang]);

  function openMedia(media: Media) {
    const targetId =
      session?.provider === 'mal' && media.malId ? `mal:${media.malId}` : media.id;
    onClose();
    navigate(`/media/${media.type.toLowerCase()}/${encodeURIComponent(targetId)}`);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col pt-[max(env(safe-area-inset-top),0.75rem)] px-3 pb-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div className="flex items-center gap-2 px-3.5 py-3 border-b border-slate-800/80">
          <Search className="h-4 w-4 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${type.toLowerCase()} titles…`}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-xs font-medium text-slate-300 cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Type Switch + Advanced Search link */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-slate-800/60">
          <div className="flex rounded-xl border border-slate-800 bg-slate-950/60 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setType('ANIME')}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 font-medium cursor-pointer ${
                type === 'ANIME' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              <Tv className="h-3 w-3" /> Anime
            </button>
            <button
              type="button"
              onClick={() => setType('MANGA')}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 font-medium cursor-pointer ${
                type === 'MANGA' ? 'bg-indigo-500 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              <BookOpen className="h-3 w-3" /> Manga
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/discover?tab=search');
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 cursor-pointer"
          >
            Full Filters
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto p-3 space-y-3">
          {!query.trim() ? (
            <p className="text-xs text-slate-400 text-center py-8">
              Type a title to search your list &amp; global catalog.
            </p>
          ) : (
            <>
              {localMatches.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-sky-400 px-1">
                    In Your List
                  </div>
                  {localMatches.map((entry) => (
                    <button
                      key={`local-${entry.media.id}`}
                      type="button"
                      onClick={() => openMedia(entry.media)}
                      className="w-full text-left flex items-center gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-2 cursor-pointer"
                    >
                      <img
                        src={
                          entry.media.coverUrl ||
                          'https://placehold.co/60x84/0f172a/64748b?text=?'
                        }
                        alt={formatMediaTitle(entry.media, titleLang, shortTitles)}
                        className="h-12 w-9 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          {formatMediaTitle(entry.media, titleLang, shortTitles)}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {entry.status} · {entry.progress}/
                          {(type === 'ANIME' ? entry.media.episodes : entry.media.chapters) ?? '?'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase text-slate-400 px-1">
                  Global Results
                </div>
                {isFetching ? (
                  <p className="text-xs text-slate-400 text-center py-6">Searching…</p>
                ) : (remoteRes?.items ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No matches found.</p>
                ) : (
                  (remoteRes?.items ?? []).map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => openMedia(media)}
                      className="w-full text-left flex items-center gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-2 cursor-pointer"
                    >
                      <img
                        src={
                          media.coverUrl ||
                          'https://placehold.co/60x84/0f172a/64748b?text=?'
                        }
                        alt={formatMediaTitle(media, titleLang, shortTitles)}
                        className="h-12 w-9 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          {formatMediaTitle(media, titleLang, shortTitles)}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                          <span>{media.format ?? media.type}</span>
                          {media.averageScore && (
                            <span className="inline-flex items-center gap-0.5 text-amber-300">
                              <Star className="h-2.5 w-2.5 fill-amber-300" />
                              {media.averageScore}%
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
