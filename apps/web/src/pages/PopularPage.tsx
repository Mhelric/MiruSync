import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useMediaList,
  usePopularMedia,
  useSettingsStore,
  useUpdateEntry,
  type Media,
  type MediaType,
  type PopularKind,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';
import { DiscoverCard } from '../components/DiscoverCard';

const TABS: { key: PopularKind; label: string }[] = [
  { key: 'trending', label: 'Trending Now' },
  { key: 'season', label: 'This Season' },
  { key: 'upcoming', label: 'Upcoming Next Season' },
  { key: 'alltime', label: 'All-Time Popular' },
  { key: 'toprated', label: 'Top Rated' },
];

export function PopularPage() {
  const showAdult = useSettingsStore((s) => s.settings.show_adult);
  const [searchParams] = useSearchParams();
  const initialType: MediaType =
    searchParams.get('type')?.toUpperCase() === 'MANGA' ? 'MANGA' : 'ANIME';
  const [type, setType] = useState<MediaType>(initialType);
  const [kind, setKind] = useState<PopularKind>('trending');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const paramType = searchParams.get('type')?.toUpperCase();
    if (paramType === 'MANGA' || paramType === 'ANIME') {
      setType(paramType);
      setPage(1);
    }
  }, [searchParams]);

  const { data: userList } = useMediaList(type);
  const updateEntry = useUpdateEntry();
  const { data, isLoading, isError, refetch } = usePopularMedia(type, kind, page);

  const listIds = useMemo(
    () => new Set((userList ?? []).map((e) => e.media.id)),
    [userList]
  );

  function handleQuickAdd(media: Media) {
    updateEntry.mutate({
      mediaId: media.id,
      type: media.type,
      status: 'PLANNING',
      progress: 0,
    });
  }

  return (
    <DesktopLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Popular &amp; Seasonal</h1>
            <p className="text-sm text-slate-400">
              Discover what&apos;s trending and top-rated right now.
            </p>
          </div>

          <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setType('ANIME');
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 font-medium cursor-pointer ${
                type === 'ANIME' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              Anime
            </button>
            <button
              type="button"
              onClick={() => {
                setType('MANGA');
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 font-medium cursor-pointer ${
                type === 'MANGA' ? 'bg-indigo-500 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              Manga
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setKind(t.key);
                setPage(1);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                kind === t.key
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-xl bg-slate-900/80 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <p className="text-sm text-rose-300">Failed to load popular titles.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded-lg bg-rose-500/20 px-4 py-1.5 text-xs text-rose-200 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {(data?.items ?? [])
                .filter((m) => showAdult || !m.isAdult)
                .map((media) => (
                  <DiscoverCard
                    key={media.id}
                    media={media}
                    inList={listIds.has(media.id)}
                    onQuickAdd={handleQuickAdd}
                  />
                ))}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs font-mono text-slate-400">Page {page}</span>
              <button
                type="button"
                disabled={!data?.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </DesktopLayout>
  );
}
