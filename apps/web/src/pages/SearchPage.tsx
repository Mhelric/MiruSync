import { useEffect, useMemo, useState } from 'react';
import { Clock, Search, X } from 'lucide-react';
import {
  useLocalPrefsStore,
  useMediaList,
  useMediaSearch,
  useSettingsStore,
  useUpdateEntry,
  type Media,
  type MediaType,
  type SearchSort,
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
const ANIME_FORMATS = ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'];
const MANGA_FORMATS = ['MANGA', 'NOVEL', 'ONE_SHOT'];
const STATUSES = [
  { value: 'RELEASING', label: 'Airing / Releasing' },
  { value: 'FINISHED', label: 'Finished' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function SearchPage() {
  const showAdultDefault = useSettingsStore((s) => s.settings.show_adult);
  const recentSearches = useLocalPrefsStore((s) => s.recentSearches);
  const addRecentSearch = useLocalPrefsStore((s) => s.addRecentSearch);
  const clearRecentSearches = useLocalPrefsStore((s) => s.clearRecentSearches);

  const [type, setType] = useState<MediaType>('ANIME');
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [season, setSeason] = useState('');
  const [format, setFormat] = useState('');
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState('');
  const [sort, setSort] = useState<SearchSort>('POPULARITY_DESC');
  const [includeAdult, setIncludeAdult] = useState(showAdultDefault);

  useEffect(() => {
    setIncludeAdult(showAdultDefault);
  }, [showAdultDefault]);

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
    season: type === 'ANIME' && season ? season : undefined,
    format: format || undefined,
    status: status || undefined,
    minScore: minScore ? Number(minScore) : undefined,
    sort,
    includeAdult,
  });

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const timer = setTimeout(() => {
      addRecentSearch(trimmed);
    }, 900);
    return () => clearTimeout(timer);
  }, [query, addRecentSearch]);

  function handleQuickAdd(media: Media) {
    updateEntry.mutate({
      mediaId: media.id,
      type: media.type,
      status: 'PLANNING',
      progress: 0,
    });
  }

  const hasFilters = Boolean(
    query.trim() || genre || year || season || format || status || minScore
  );

  const formatOptions = type === 'ANIME' ? ANIME_FORMATS : MANGA_FORMATS;

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

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAdult}
                onChange={(e) => setIncludeAdult(e.target.checked)}
                className="h-3.5 w-3.5 accent-sky-500 cursor-pointer"
              />
              18+ Adult
            </label>

            <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setType('ANIME');
                  setFormat('');
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
                  setFormat('');
                  setSeason('');
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

        {/* Search + Primary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            value={sort}
            onChange={(e) => setSort(e.target.value as SearchSort)}
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200"
          >
            <option value="POPULARITY_DESC">Sort: Popularity</option>
            <option value="SCORE_DESC">Sort: Highest Score</option>
            <option value="START_DATE_DESC">Sort: Newest</option>
          </select>
        </div>

        {/* Secondary Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-200"
          >
            <option value="">All Formats</option>
            {formatOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-200"
          >
            <option value="">Any Status</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-200"
          >
            <option value="">Any Score</option>
            <option value="60">Score 60%+</option>
            <option value="70">Score 70%+</option>
            <option value="80">Score 80%+</option>
            <option value="90">Score 90%+</option>
          </select>

          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            disabled={type === 'MANGA'}
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
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
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
          />
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Clock className="h-3 w-3" />
              Recent:
            </span>
            {recentSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuery(item)}
                className="rounded-full border border-slate-800 bg-slate-900/70 hover:border-sky-500/40 px-2.5 py-1 text-slate-300 hover:text-sky-300 transition-colors cursor-pointer"
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={clearRecentSearches}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 px-1.5 py-1 cursor-pointer"
              title="Clear recent searches"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
        )}

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
              .filter((m) => includeAdult || !m.isAdult)
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
