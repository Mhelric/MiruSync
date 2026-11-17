import { useMemo, useState } from 'react';
import { ExternalLink, Newspaper } from 'lucide-react';
import {
  formatMediaTitle,
  useAnimeNews,
  useAuthStore,
  useMediaList,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';

export function NewsPage() {
  const session = useAuthStore((s) => s.session);
  const { data, isLoading, isError, refetch } = useAnimeNews();
  const { data: animeList } = useMediaList('ANIME');
  const { data: mangaList } = useMediaList('MANGA');
  const [tab, setTab] = useState<'all' | 'foryou'>('all');

  const trackedTitles = useMemo(() => {
    const titles: string[] = [];
    for (const entry of [...(animeList ?? []), ...(mangaList ?? [])]) {
      const t = formatMediaTitle(entry.media, 'romaji').toLowerCase();
      if (t.length >= 4) titles.push(t);
      if (entry.media.title.english) {
        const en = entry.media.title.english.toLowerCase();
        if (en.length >= 4) titles.push(en);
      }
    }
    return titles;
  }, [animeList, mangaList]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    if (tab === 'all') return all;
    return all.filter((item) => {
      const haystack = `${item.title} ${item.snippet}`.toLowerCase();
      return trackedTitles.some((t) => haystack.includes(t));
    });
  }, [data, tab, trackedTitles]);

  const platformLabel = session?.provider === 'mal' ? 'MAL Picks' : 'AniList Picks';

  return (
    <DesktopLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-sky-400" />
              Anime &amp; Manga News
            </h1>
            <p className="text-sm text-slate-400">
              Latest stories from Anime News Network, filtered for your list.
            </p>
          </div>

          <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`rounded-md px-3 py-1.5 font-medium cursor-pointer ${
                tab === 'all' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              All News
            </button>
            <button
              type="button"
              onClick={() => setTab('foryou')}
              className={`rounded-md px-3 py-1.5 font-medium cursor-pointer ${
                tab === 'foryou' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              For You ({platformLabel})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <p className="text-sm text-rose-300">Failed to load news feed.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded-lg bg-rose-500/20 px-4 py-1.5 text-xs text-rose-200 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center text-sm text-slate-400">
            {tab === 'foryou'
              ? 'No recent news stories match titles in your list.'
              : 'No news stories available.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-slate-800/80 bg-slate-900/50 hover:border-slate-700 p-4 flex flex-col justify-between gap-3 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                    <span className="text-sky-400">{item.source}</span>
                    <span>
                      {new Date(item.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="font-semibold text-sm text-slate-100 group-hover:text-sky-400 transition-colors">
                    {item.title}
                  </h2>
                  {item.snippet && (
                    <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">
                      {item.snippet}
                    </p>
                  )}
                </div>

                <div className="inline-flex items-center gap-1 text-xs text-sky-400 font-medium">
                  Read full article
                  <ExternalLink className="h-3 w-3" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </DesktopLayout>
  );
}
