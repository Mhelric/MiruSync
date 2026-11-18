import { useMemo, useState } from 'react';
import {
  useMediaList,
  useNewReleases,
  useUpdateEntry,
  type Media,
  type MediaType,
  type NewReleaseTab,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';
import { DiscoverCard } from '../components/DiscoverCard';

const TABS: { key: NewReleaseTab; label: string }[] = [
  { key: 'just_aired', label: 'Just Aired' },
  { key: 'this_season', label: 'New This Season' },
  { key: 'announced', label: 'Recently Announced' },
];

function formatAiredAgo(airingAtSec?: number): string {
  if (!airingAtSec) return '';
  const diffMin = Math.max(1, Math.floor((Date.now() / 1000 - airingAtSec) / 60));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function NewReleasesPage() {
  const [type, setType] = useState<MediaType>('ANIME');
  const [tab, setTab] = useState<NewReleaseTab>('just_aired');
  const [myListOnly, setMyListOnly] = useState(false);

  const { data: userList } = useMediaList(type);
  const updateEntry = useUpdateEntry();
  const { data, isLoading, isError, refetch } = useNewReleases(type, tab);

  const listIds = useMemo(
    () => new Set((userList ?? []).map((e) => e.media.id)),
    [userList]
  );

  const malIds = useMemo(
    () =>
      new Set(
        (userList ?? [])
          .map((e) => e.media.malId)
          .filter((id): id is number => Boolean(id))
      ),
    [userList]
  );

  const items = useMemo(() => {
    const raw = data ?? [];
    if (!myListOnly) return raw;
    return raw.filter(
      (item) =>
        listIds.has(item.media.id) ||
        (item.media.malId !== undefined && malIds.has(item.media.malId))
    );
  }, [data, myListOnly, listIds, malIds]);

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
            <h1 className="text-2xl font-bold tracking-tight">New Releases</h1>
            <p className="text-sm text-slate-400">
              Recently aired episodes, newly started seasonal titles, and upcoming announcements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={myListOnly}
                onChange={(e) => setMyListOnly(e.target.checked)}
                className="h-3.5 w-3.5 accent-sky-500 cursor-pointer"
              />
              My List Only
            </label>

            <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
              <button
                type="button"
                onClick={() => setType('ANIME')}
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
                  if (tab === 'just_aired') setTab('this_season');
                }}
                className={`rounded-md px-3 py-1.5 font-medium cursor-pointer ${
                  type === 'MANGA' ? 'bg-indigo-500 text-slate-950 font-semibold' : 'text-slate-400'
                }`}
              >
                Manga
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
          {TABS.filter((t) => type === 'ANIME' || t.key !== 'just_aired').map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                tab === t.key
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
            <p className="text-sm text-rose-300">Failed to load new releases.</p>
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
            {myListOnly
              ? 'None of your tracked titles appeared in this release window.'
              : 'No releases found.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item) => {
              const inList =
                listIds.has(item.media.id) ||
                (item.media.malId !== undefined && malIds.has(item.media.malId));
              return (
                <div key={item.media.id} className="space-y-1.5">
                  <DiscoverCard
                    media={item.media}
                    inList={inList}
                    onQuickAdd={handleQuickAdd}
                  />
                  {item.episode !== undefined && (
                    <div className="flex items-center justify-between px-1 text-[11px] font-mono text-slate-400">
                      <span className="text-sky-400">Ep {item.episode}</span>
                      <span>{formatAiredAgo(item.airingAt)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DesktopLayout>
  );
}
