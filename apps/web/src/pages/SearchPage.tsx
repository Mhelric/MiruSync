import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  useMediaList,
  useMediaSearch,
  useUpdateEntry,
  type Media,
  type MediaType,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';
import { DiscoverCard } from '../components/DiscoverCard';

const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Thriller',
];

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

export function SearchPage() {
  const [type, setType] = useState<MediaType>('ANIME');
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [season, setSeason] = useState('');

  const { data: userList } = useMediaList(type);
  const updateEntry = useUpdateEntry();

  const listIds = useMemo(
    () => new Set((userList ?? []).map((e) => e.media.id)),
    [userList]
  );

  const { data, isFetching, isError } = useMediaSearch(query, {
    type,
    genre: genre || undefined,
    year: year ? Number(year) : undefined,
    season: season || undefined,
    includeAdult: false,
  });

  function handleQuickAdd(media: Media) {
    updateEntry.mutate({
      mediaId: media.id,
      type: media.type,
      status: 'PLANNING',
      progress: 0,
    });
  }

  const hasFilters = Boolean(
    query.trim() || genre || year || season
  );

  return (
    <DesktopLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Search</h1>
            <p className="text-sm text-slate-400">
              Find anime and manga to add to your list.
            </p>
          </div>

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
              onClick={() => setType('MANGA')}
              className={`rounded-md px-3 py-1.5 font-medium cursor-pointer ${
                type === 'MANGA' ? 'bg-indigo-500 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              Manga
            </button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${type.toLowerCase()} titles…`}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/70 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200"
          >
            <option value="">All Genres</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            disabled={type === 'MANGA'}
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 disabled:opacity-40"
          >
            <option value="">Any Season</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1960}
            max={2030}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year (e.g. 2025)"
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>

        {/* Results */}
        {!hasFilters ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-sm text-slate-400">
            Enter a search term or pick a filter above to explore titles.
          </div>
        ) : isFetching ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-xl bg-slate-900/80 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
            Search failed. Please try again.
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center text-sm text-slate-400">
            No matching titles found.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data!.items
              .filter((m) => !m.isAdult)
              .map((media) => (
                <DiscoverCard
                  key={media.id}
                  media={media}
                  inList={listIds.has(media.id)}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
          </div>
        )}
      </div>
    </DesktopLayout>
  );
}
