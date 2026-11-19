import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { Calendar, Check, ExternalLink, Flame, Newspaper, Plus, Search, Sparkles, Star, X } from 'lucide-react';
import {
  formatCountdown,
  formatMediaTitle,
  useAiringSchedule,
  useAnimeNews,
  useAuthStore,
  useLocalPrefsStore,
  useMediaList,
  useMediaSearch,
  useNewReleases,
  usePopularMedia,
  useSettingsStore,
  useUpdateEntry,
  type AiringScheduleItem,
  type Media,
  type MediaType,
  type NewReleaseTab,
  type PopularKind,
  type SearchSort,
} from '@mirusync/core';
import { MobileLayout } from '../layouts/MobileLayout';
import { API_BASE } from '../lib/mobileAuth';

type DiscoverTab = 'popular' | 'new' | 'calendar' | 'search' | 'news';

const POPULAR_KINDS: { key: PopularKind; label: string }[] = [
  { key: 'trending', label: 'Trending' },
  { key: 'season', label: 'This Season' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'toprated', label: 'Top Rated' },
  { key: 'alltime', label: 'All Time' },
];

const NEW_KINDS: { key: NewReleaseTab; label: string }[] = [
  { key: 'just_aired', label: 'Just Aired' },
  { key: 'this_season', label: 'This Season' },
  { key: 'announced', label: 'Recently Added' },
];

const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Hentai',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Thriller',
];

const POPULAR_TAGS = [
  'Isekai',
  'Time Travel',
  'Reincarnation',
  'Found Family',
  'Anti-Hero',
  'Magic',
  'Swordplay',
  'Cyberpunk',
  'School',
  'Survival',
  'Shounen',
  'Seinen',
];

export function MobileDiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as DiscoverTab) || 'popular';

  const session = useAuthStore((s) => s.session);
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const showAdult = useSettingsStore((s) => s.settings.show_adult);
  const shortTitles = useLocalPrefsStore((s) => s.shortTitles);
  const recentSearches = useLocalPrefsStore((s) => s.recentSearches);
  const addRecentSearch = useLocalPrefsStore((s) => s.addRecentSearch);
  const clearRecentSearches = useLocalPrefsStore((s) => s.clearRecentSearches);

  const [tab, setTab] = useState<DiscoverTab>(initialTab);
  const [mediaType, setMediaType] = useState<MediaType>('ANIME');
  const [popularKind, setPopularKind] = useState<PopularKind>('trending');
  const [newKind, setNewKind] = useState<NewReleaseTab>('just_aired');

  // Search filters
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<SearchSort>('POPULARITY_DESC');
  const [includeAdult, setIncludeAdult] = useState(showAdult);

  // Calendar selected day
  const [selectedDay, setSelectedDay] = useState<string>('');

  useEffect(() => {
    const paramTab = searchParams.get('tab') as DiscoverTab | null;
    if (paramTab && ['popular', 'new', 'calendar', 'search', 'news'].includes(paramTab)) {
      setTab(paramTab);
    }
  }, [searchParams]);

  const { data: userList } = useMediaList(mediaType, undefined, API_BASE);
  const listIds = useMemo(
    () => new Set((userList ?? []).map((e) => e.media.id)),
    [userList]
  );

  const { data: popular, isLoading: popularLoading } = usePopularMedia(
    mediaType,
    popularKind,
    1,
    API_BASE
  );
  const { data: newReleases, isLoading: newLoading } = useNewReleases(
    mediaType,
    newKind
  );
  const { data: schedule, isLoading: calLoading } = useAiringSchedule(API_BASE);
  const { data: news, isLoading: newsLoading } = useAnimeNews(API_BASE);
  const { data: searchRes, isFetching: searchLoading } = useMediaSearch(
    query,
    {
      type: mediaType,
      genre: genre || undefined,
      tag: tag.trim() || undefined,
      sort,
      includeAdult,
      perPage: 20,
    },
    API_BASE
  );
  const updateEntry = useUpdateEntry(API_BASE);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const t = setTimeout(() => addRecentSearch(trimmed), 900);
    return () => clearTimeout(t);
  }, [query, addRecentSearch]);

  function selectTab(next: DiscoverTab) {
    setTab(next);
    setSearchParams({ tab: next }, { replace: true });
  }

  function resolveMediaId(item: { id: string; malId?: number }) {
    if (session?.provider === 'mal' && item.malId) {
      return `mal:${item.malId}`;
    }
    return item.id;
  }

  function handleQuickAdd(media: Media) {
    updateEntry.mutate({
      mediaId: media.id,
      type: media.type,
      status: 'PLANNING',
      progress: 0,
    });
  }

  const calendarDays = useMemo(() => {
    const groups = new Map<string, AiringScheduleItem[]>();
    for (const item of schedule?.items ?? []) {
      const d = new Date(item.airingAt * 1000);
      const key = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      const existing = groups.get(key) ?? [];
      existing.push(item);
      groups.set(key, existing);
    }
    return Array.from(groups.entries());
  }, [schedule]);

  const activeDay =
    selectedDay && calendarDays.some(([d]) => d === selectedDay)
      ? selectedDay
      : calendarDays[0]?.[0] ?? '';

  const activeDayItems =
    calendarDays.find(([d]) => d === activeDay)?.[1] ?? [];

  function renderPosterGrid(items: Media[]) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {items.map((media) => {
          const inList = listIds.has(media.id);
          return (
            <div
              key={media.id}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden flex flex-col"
            >
              <Link
                to={`/media/${media.type.toLowerCase()}/${encodeURIComponent(
                  resolveMediaId(media)
                )}`}
                className="relative aspect-[2/3] bg-slate-900 block"
              >
                <img
                  src={
                    media.coverUrl ||
                    'https://placehold.co/240x360/0f172a/64748b?text=?'
                  }
                  alt={formatMediaTitle(media, titleLang, shortTitles)}
                  className="h-full w-full object-cover"
                />
                {media.averageScore && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 rounded-lg bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                    <Star className="h-2.5 w-2.5 fill-amber-300" />
                    {media.averageScore}%
                  </span>
                )}
                {media.isAdult && (
                  <span className="absolute top-2 left-2 rounded-md bg-rose-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    18+
                  </span>
                )}
              </Link>

              <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                <Link
                  to={`/media/${media.type.toLowerCase()}/${encodeURIComponent(
                    resolveMediaId(media)
                  )}`}
                  className="text-xs font-semibold text-slate-100 line-clamp-2 leading-snug"
                >
                  {formatMediaTitle(media, titleLang, shortTitles)}
                </Link>

                <button
                  type="button"
                  disabled={inList}
                  onClick={() => handleQuickAdd(media)}
                  className={`w-full inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                    inList
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-sky-500/15 border border-sky-500/30 text-sky-300 active:scale-95'
                  }`}
                >
                  {inList ? (
                    <>
                      <Check className="h-3 w-3" /> In List
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" /> Add
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <MobileLayout title="Discover">
      <div className="space-y-4">
        {/* Top Segmented Pill Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'popular' as const, label: 'Popular', icon: Flame },
            { key: 'new' as const, label: 'New', icon: Sparkles },
            { key: 'calendar' as const, label: 'Calendar', icon: Calendar },
            { key: 'search' as const, label: 'Search', icon: Search },
            { key: 'news' as const, label: 'News', icon: Newspaper },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => selectTab(key)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                tab === key
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Popular */}
        {tab === 'popular' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {POPULAR_KINDS.map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => setPopularKind(k.key)}
                    className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-medium cursor-pointer ${
                      popularKind === k.key
                        ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                        : 'border border-slate-800 bg-slate-900/50 text-slate-400'
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMediaType((t) => (t === 'ANIME' ? 'MANGA' : 'ANIME'))}
                className="shrink-0 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-mono text-sky-400 cursor-pointer"
              >
                {mediaType}
              </button>
            </div>

            {popularLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              renderPosterGrid(
                (popular?.items ?? []).filter((m) => showAdult || !m.isAdult)
              )
            )}
          </div>
        )}

        {/* New Releases */}
        {tab === 'new' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {NEW_KINDS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setNewKind(k.key)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    newKind === k.key
                      ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                      : 'border border-slate-800 bg-slate-900/50 text-slate-400'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>

            {newLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              renderPosterGrid(
                (newReleases ?? [])
                  .map((r) => r.media)
                  .filter((m) => showAdult || !m.isAdult)
              )
            )}
          </div>
        )}

        {/* Calendar */}
        {tab === 'calendar' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {calendarDays.map(([dayLabel]) => (
                <button
                  key={dayLabel}
                  type="button"
                  onClick={() => setSelectedDay(dayLabel)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium cursor-pointer ${
                    activeDay === dayLabel
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'border border-slate-800 bg-slate-900/60 text-slate-300'
                  }`}
                >
                  {dayLabel}
                </button>
              ))}
            </div>

            {calLoading ? (
              <p className="text-xs text-slate-400 text-center py-8">Loading schedule…</p>
            ) : (
              <div className="space-y-2.5">
                {activeDayItems.map((item) => (
                  <Link
                    key={item.id}
                    to={`/media/anime/${encodeURIComponent(
                      resolveMediaId(item.media)
                    )}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-2.5"
                  >
                    <img
                      src={
                        item.media.coverUrl ||
                        'https://placehold.co/60x84/0f172a/64748b?text=?'
                      }
                      alt={formatMediaTitle(item.media, titleLang, shortTitles)}
                      className="h-14 w-10 rounded-xl object-cover shrink-0 bg-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-100 line-clamp-1">
                        {formatMediaTitle(item.media, titleLang, shortTitles)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Ep {item.episode} ·{' '}
                        {new Date(item.airingAt * 1000).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 shrink-0">
                      {formatCountdown(item.airingAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        {tab === 'search' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${mediaType.toLowerCase()}…`}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/70 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setMediaType((t) => (t === 'ANIME' ? 'MANGA' : 'ANIME'))}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-sky-400 cursor-pointer"
              >
                {mediaType}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={genre}
                onChange={(e) => {
                  const next = e.target.value;
                  setGenre(next);
                  if (next === 'Hentai') setIncludeAdult(true);
                }}
                className="rounded-xl border border-slate-800 bg-slate-900/70 px-2.5 py-2 text-xs text-slate-200"
              >
                <option value="">All Genres</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              <div>
                <input
                  type="text"
                  list="mobile-popular-tags"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Tag (e.g. Isekai)"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500"
                />
                <datalist id="mobile-popular-tags">
                  {POPULAR_TAGS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SearchSort)}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900/70 px-2.5 py-2 text-xs text-slate-200"
              >
                <option value="POPULARITY_DESC">Sort: Popularity</option>
                <option value="SCORE_DESC">Sort: Highest Score</option>
                <option value="START_DATE_DESC">Sort: Newest</option>
              </select>

              <label className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAdult}
                  onChange={(e) => setIncludeAdult(e.target.checked)}
                  className="accent-sky-500"
                />
                18+
              </label>
            </div>

            {recentSearches.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {recentSearches.slice(0, 6).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuery(item)}
                    className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-slate-300 cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-slate-500 px-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {!query.trim() && !genre && !tag.trim() ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
                Type a title, pick a genre, or enter a tag to search.
              </div>
            ) : searchLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              renderPosterGrid(searchRes?.items ?? [])
            )}
          </div>
        )}

        {/* News */}
        {tab === 'news' && (
          <div className="space-y-3">
            {newsLoading ? (
              <p className="text-xs text-slate-400 text-center py-8">Loading news…</p>
            ) : (
              (news?.items ?? []).map((item) => (
                <button
                  key={item.id || item.link}
                  type="button"
                  onClick={() => void Browser.open({ url: item.link })}
                  className="w-full text-left flex gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 cursor-pointer"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-20 w-24 rounded-xl object-cover shrink-0 bg-slate-800"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-sky-400">
                      <span>{item.source}</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </div>
                    <div className="text-xs font-semibold text-slate-100 line-clamp-2 leading-snug">
                      {item.title}
                    </div>
                    {item.snippet && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {item.snippet}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
