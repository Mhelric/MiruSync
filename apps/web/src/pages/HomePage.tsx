import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, Flame, Sparkles, Star, Tv } from 'lucide-react';
import {
  AniListProvider,
  formatMediaTitle,
  useAuthStore,
  useDeleteEntry,
  useMediaList,
  usePopularMedia,
  useSettingsStore,
  useUpdateEntry,
  type ListEntry,
  type Media,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';
import { MediaCard } from '../components/MediaCard';
import { DiscoverCard } from '../components/DiscoverCard';
import { EditEntryModal } from '../components/EditEntryModal';

export function HomePage() {
  const session = useAuthStore((s) => s.session);
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const { data: animeList, isLoading: animeLoading } = useMediaList('ANIME');
  const { data: mangaList, isLoading: mangaLoading } = useMediaList('MANGA');
  const { data: popularAnime, isLoading: popularAnimeLoading } = usePopularMedia(
    'ANIME',
    'trending',
    1
  );
  const { data: popularManga, isLoading: popularMangaLoading } = usePopularMedia(
    'MANGA',
    'trending',
    1
  );
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();
  const [editing, setEditing] = useState<ListEntry | null>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const { data: seasonalData } = useQuery({
    queryKey: ['homeSeasonalBanners'],
    queryFn: () => new AniListProvider().getPopular('ANIME', 'trending', 1),
    staleTime: 1000 * 60 * 15,
  });

  const heroSlides = useMemo(() => {
    const items = seasonalData?.items ?? [];
    return items.filter((m) => Boolean(m.bannerUrl) && !m.isAdult).slice(0, 6);
  }, [seasonalData]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const currentHero = heroSlides[heroIdx];
  const heroTargetId =
    currentHero && session?.provider === 'mal' && currentHero.malId
      ? `mal:${currentHero.malId}`
      : currentHero?.id;

  const watching = (animeList ?? [])
    .filter((e) => e.status === 'CURRENT' && !e.media.isAdult)
    .slice(0, 5);
  const reading = (mangaList ?? [])
    .filter((e) => e.status === 'CURRENT' && !e.media.isAdult)
    .slice(0, 5);

  const animeListIds = useMemo(
    () => new Set((animeList ?? []).map((e) => e.media.id)),
    [animeList]
  );
  const mangaListIds = useMemo(
    () => new Set((mangaList ?? []).map((e) => e.media.id)),
    [mangaList]
  );

  const briefPopularAnime = (popularAnime?.items ?? [])
    .filter((m) => !m.isAdult)
    .slice(0, 5);
  const briefPopularManga = (popularManga?.items ?? [])
    .filter((m) => !m.isAdult)
    .slice(0, 5);

  function handleQuickAdd(media: Media) {
    updateEntry.mutate({
      mediaId: media.id,
      type: media.type,
      status: 'PLANNING',
      progress: 0,
    });
  }

  function handleHeroTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleHeroTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || heroSlides.length <= 1) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) {
      setHeroIdx((prev) => (prev + 1) % heroSlides.length);
    } else {
      setHeroIdx((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    }
  }

  return (
    <DesktopLayout>
      <div className="space-y-6">
        {/* Ambient Aurora Greeting Card */}
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/25 bg-slate-900/70 p-4 sm:p-5 flex flex-col gap-3 shadow-lg">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-sky-500/25 blur-3xl animate-aurora"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-indigo-500/20 blur-3xl animate-aurora"
            style={{ animationDelay: '-4s' }}
          />
          <div className="relative z-10 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-sky-400">
              <Sparkles className="h-3 w-3 animate-float-idle" />
              {new Date().getHours() < 12
                ? 'Good morning'
                : new Date().getHours() < 18
                  ? 'Good afternoon'
                  : 'Good evening'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              Welcome back, <span className="text-sky-400">{session?.user.name}</span>
            </h1>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 backdrop-blur-md px-3.5 py-2">
                <Tv className="h-4 w-4 text-sky-400" />
                <span className="text-base font-bold font-mono text-sky-400">
                  {animeList?.length ?? '—'}
                </span>
                <span className="text-xs text-slate-300">Anime</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md px-3.5 py-2">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                <span className="text-base font-bold font-mono text-indigo-400">
                  {mangaList?.length ?? '—'}
                </span>
                <span className="text-xs text-slate-300">Manga</span>
              </div>
            </div>
          </div>
        </section>

        {/* Swipable Rotating Seasonal Trending Hero Banner */}
        <section
          onTouchStart={handleHeroTouchStart}
          onTouchEnd={handleHeroTouchEnd}
          className="hero-banner relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-slate-900/70 sm:min-h-[220px] flex flex-col justify-between shadow-2xl touch-pan-y select-none"
        >
          {/* Desktop full-bleed background */}
          {heroSlides.map((slide, idx) => (
            <img
              key={slide.id}
              src={slide.bannerUrl}
              alt=""
              aria-hidden="true"
              className={`hidden sm:block absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                idx === heroIdx ? 'opacity-45' : 'opacity-0'
              }`}
            />
          ))}
          <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/40 pointer-events-none" />

          {/* Mobile crisp top banner image */}
          {currentHero?.bannerUrl && (
            <div className="sm:hidden relative h-32 w-full overflow-hidden">
              <img
                src={currentHero.bannerUrl}
                alt={formatMediaTitle(currentHero, titleLang)}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
            </div>
          )}

          <div className="relative z-10 p-4 sm:p-6 md:p-8 flex flex-col justify-between flex-1 gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              {currentHero?.coverUrl && (
                <img
                  src={currentHero.coverUrl}
                  alt={formatMediaTitle(currentHero, titleLang)}
                  className="sm:hidden h-24 w-16 rounded-lg object-cover border border-white/15 shrink-0 mt-0.5 shadow-lg"
                />
              )}
              <div className="min-w-0 flex-1">
                {currentHero ? (
                  <div className="max-w-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 text-[11px] text-sky-300">
                        <Flame className="h-3 w-3" />
                        Trending Now
                      </span>
                      {currentHero.averageScore && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-300" />
                          {currentHero.averageScore}%
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-white line-clamp-2">
                      {formatMediaTitle(currentHero, titleLang)}
                    </h2>
                    {currentHero.synopsis && (
                      <p className="text-xs md:text-sm text-slate-300 line-clamp-2">
                        {currentHero.synopsis.replace(/<[^>]+>/g, '')}
                      </p>
                    )}
                  </div>
                ) : (
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Trending this season
                  </h2>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              {currentHero && heroTargetId ? (
                <Link
                  to={`/media/anime/${encodeURIComponent(heroTargetId)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors"
                >
                  View Details
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <div />
              )}

              {heroSlides.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {heroSlides.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setHeroIdx(idx)}
                      aria-label={`Show ${formatMediaTitle(s, titleLang)}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === heroIdx
                          ? 'w-5 bg-sky-400'
                          : 'w-1.5 bg-white/30 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Continue Watching */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Tv className="h-4 w-4 text-sky-400 animate-float-idle" />
              Continue Watching
            </h2>
            <Link to="/anime" className="text-xs text-sky-400 hover:underline shrink-0">
              View all anime →
            </Link>
          </div>

          {animeLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-xl bg-slate-900/80 border border-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : watching.length === 0 ? (
            <p className="text-sm text-slate-400">No anime currently watching.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {watching.map((entry) => (
                <MediaCard
                  key={entry.media.id}
                  entry={entry}
                  scoreFormat={session?.user.scoreFormat}
                  onIncrement={(e) =>
                    updateEntry.mutate({
                      mediaId: e.media.id,
                      type: 'ANIME',
                      progress: e.progress + 1,
                    })
                  }
                  onEdit={setEditing}
                />
              ))}
            </div>
          )}
        </section>

        {/* Continue Reading */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-400 animate-float-idle" />
              Continue Reading
            </h2>
            <Link to="/manga" className="text-xs text-indigo-400 hover:underline">
              View all manga →
            </Link>
          </div>

          {mangaLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-xl bg-slate-900/80 border border-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : reading.length === 0 ? (
            <p className="text-sm text-slate-400">No manga currently reading.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {reading.map((entry) => (
                <MediaCard
                  key={entry.media.id}
                  entry={entry}
                  scoreFormat={session?.user.scoreFormat}
                  onIncrement={(e) =>
                    updateEntry.mutate({
                      mediaId: e.media.id,
                      type: 'MANGA',
                      progress: e.progress + 1,
                    })
                  }
                  onEdit={setEditing}
                />
              ))}
            </div>
          )}
        </section>

        {/* Popular Anime */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-sky-400" />
              Popular Anime
            </h2>
            <Link to="/popular" className="text-xs text-sky-400 hover:underline">
              Show more →
            </Link>
          </div>

          {popularAnimeLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-xl bg-slate-900/80 border border-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {briefPopularAnime.map((media) => (
                <DiscoverCard
                  key={media.id}
                  media={media}
                  inList={animeListIds.has(media.id)}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
          )}
        </section>

        {/* Popular Manga */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-indigo-400" />
              Popular Manga
            </h2>
            <Link
              to="/popular?type=manga"
              className="text-xs text-indigo-400 hover:underline"
            >
              Show more →
            </Link>
          </div>

          {popularMangaLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-xl bg-slate-900/80 border border-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {briefPopularManga.map((media) => (
                <DiscoverCard
                  key={media.id}
                  media={media}
                  inList={mangaListIds.has(media.id)}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <EditEntryModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(update) => updateEntry.mutate(update)}
          onDelete={(mediaId) =>
            deleteEntry.mutate({ mediaId, type: editing.media.type })
          }
        />
      )}
    </DesktopLayout>
  );
}
