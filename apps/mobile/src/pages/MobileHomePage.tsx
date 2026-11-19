import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Clock, Flame, Plus, Star, Tv } from 'lucide-react';
import {
  formatCountdown,
  formatMediaTitle,
  useAiringSchedule,
  useAuthStore,
  useLocalPrefsStore,
  useMediaList,
  usePopularMedia,
  useSettingsStore,
  useUpdateEntry,
} from '@mirusync/core';
import { MobileLayout } from '../layouts/MobileLayout';
import { TimeGreetingCard } from '../components/TimeGreetingCard';
import { API_BASE } from '../lib/mobileAuth';

export function MobileHomePage() {
  const session = useAuthStore((s) => s.session);
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const showAdult = useSettingsStore((s) => s.settings.show_adult);
  const shortTitles = useLocalPrefsStore((s) => s.shortTitles);

  const { data: animeList } = useMediaList('ANIME', undefined, API_BASE);
  const { data: mangaList } = useMediaList('MANGA', undefined, API_BASE);
  const { data: trending } = usePopularMedia('ANIME', 'trending', 1, API_BASE);
  const { data: schedule } = useAiringSchedule(API_BASE);
  const updateEntry = useUpdateEntry(API_BASE);

  const heroItems = useMemo(
    () =>
      (trending?.items ?? [])
        .filter((m) => showAdult || !m.isAdult)
        .slice(0, 6),
    [trending, showAdult]
  );

  const [heroIdx, setHeroIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % heroItems.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroItems.length]);

  const activeHero = heroItems[heroIdx];

  const watching = useMemo(
    () =>
      (animeList ?? [])
        .filter((e) => e.status === 'CURRENT' && (showAdult || !e.media.isAdult))
        .slice(0, 12),
    [animeList, showAdult]
  );

  const reading = useMemo(
    () =>
      (mangaList ?? [])
        .filter((e) => e.status === 'CURRENT' && (showAdult || !e.media.isAdult))
        .slice(0, 12),
    [mangaList, showAdult]
  );

  const airingSoon = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    return (schedule?.items ?? [])
      .filter((s) => s.airingAt > nowSec && s.airingAt - nowSec <= 48 * 3600)
      .slice(0, 10);
  }, [schedule]);

  function resolveMediaId(item: { id: string; malId?: number }) {
    if (session?.provider === 'mal' && item.malId) {
      return `mal:${item.malId}`;
    }
    return item.id;
  }

  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Time-of-Day Animated Anime Sky Greeting Card */}
        <TimeGreetingCard
          username={session?.user.name}
          animeCount={animeList?.length}
          mangaCount={mangaList?.length}
        />

        {/* Swipeable Trending Hero Card */}
        {activeHero && (
          <section
            className="hero-banner relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 min-h-[260px] flex items-end touch-pan-y"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null || heroItems.length <= 1) return;
              const delta =
                (e.changedTouches[0]?.clientX ?? touchStartX.current) -
                touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(delta) < 40) return;
              if (delta < 0) {
                setHeroIdx((prev) => (prev + 1) % heroItems.length);
              } else {
                setHeroIdx((prev) => (prev - 1 + heroItems.length) % heroItems.length);
              }
            }}
          >
            <img
              src={activeHero.bannerUrl || activeHero.coverUrl}
              alt={formatMediaTitle(activeHero, titleLang, shortTitles)}
              className="absolute inset-0 h-full w-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/20" />

            <div className="relative z-10 w-full p-4 flex items-end gap-3.5">
              {activeHero.coverUrl && (
                <img
                  src={activeHero.coverUrl}
                  alt={formatMediaTitle(activeHero, titleLang, shortTitles)}
                  className="w-20 aspect-[2/3] rounded-xl object-cover border border-white/15 shadow-2xl shrink-0"
                />
              )}

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/20 px-2 py-0.5 font-medium text-sky-300">
                    <Flame className="h-3 w-3" />
                    Trending
                  </span>
                  {activeHero.averageScore && (
                    <span className="inline-flex items-center gap-1 font-mono text-amber-300 font-semibold">
                      <Star className="h-3 w-3 fill-amber-300" />
                      {activeHero.averageScore}%
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-extrabold tracking-tight text-white line-clamp-2 leading-snug">
                  {formatMediaTitle(activeHero, titleLang, shortTitles)}
                </h2>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <Link
                    to={`/media/${activeHero.type.toLowerCase()}/${encodeURIComponent(
                      resolveMediaId(activeHero)
                    )}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950"
                  >
                    Details
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {heroItems.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setHeroIdx(idx)}
                        aria-label={`Slide ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === heroIdx ? 'w-5 bg-sky-400' : 'w-1.5 bg-slate-500/70'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Continue Watching Horizontal Rail */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Tv className="h-4 w-4 text-sky-400" />
              Continue Watching
            </h2>
            <Link to="/anime" className="text-xs font-medium text-sky-400">
              See all →
            </Link>
          </div>

          {watching.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-center text-xs text-slate-400">
              No anime currently watching.
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x no-scrollbar">
              {watching.map((entry) => {
                const total = entry.media.episodes;
                const pct = total
                  ? Math.min(100, Math.round((entry.progress / total) * 100))
                  : 0;
                const canInc = !total || entry.progress < total;

                return (
                  <div
                    key={entry.media.id}
                    className="w-36 shrink-0 snap-start rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden flex flex-col"
                  >
                    <Link
                      to={`/media/anime/${encodeURIComponent(resolveMediaId(entry.media))}`}
                      className="relative aspect-[2/3] bg-slate-900 block"
                    >
                      <img
                        src={
                          entry.media.coverUrl ||
                          'https://placehold.co/240x360/0f172a/64748b?text=?'
                        }
                        alt={formatMediaTitle(entry.media, titleLang, shortTitles)}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                      <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-mono text-slate-200">
                        Ep {entry.progress}/{total ?? '?'}
                      </span>
                    </Link>

                    <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                      <Link
                        to={`/media/anime/${encodeURIComponent(resolveMediaId(entry.media))}`}
                        className="text-xs font-semibold text-slate-100 line-clamp-2 leading-snug"
                      >
                        {formatMediaTitle(entry.media, titleLang, shortTitles)}
                      </Link>

                      <div className="space-y-1.5">
                        {total && (
                          <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-sky-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                        {canInc && (
                          <button
                            type="button"
                            onClick={() =>
                              updateEntry.mutate({
                                mediaId: entry.media.id,
                                type: 'ANIME',
                                progress: entry.progress + 1,
                                status:
                                  total && entry.progress + 1 >= total
                                    ? 'COMPLETED'
                                    : entry.status,
                              })
                            }
                            className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500/15 border border-sky-500/30 py-1.5 text-[11px] font-semibold text-sky-300 active:scale-95 transition-transform cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />1 Ep
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Continue Reading Horizontal Rail */}
        {reading.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                Continue Reading
              </h2>
              <Link to="/manga" className="text-xs font-medium text-indigo-400">
                See all →
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 snap-x no-scrollbar">
              {reading.map((entry) => {
                const total = entry.media.chapters;
                const canInc = !total || entry.progress < total;

                return (
                  <div
                    key={entry.media.id}
                    className="w-36 shrink-0 snap-start rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden flex flex-col"
                  >
                    <Link
                      to={`/media/manga/${encodeURIComponent(resolveMediaId(entry.media))}`}
                      className="relative aspect-[2/3] bg-slate-900 block"
                    >
                      <img
                        src={
                          entry.media.coverUrl ||
                          'https://placehold.co/240x360/0f172a/64748b?text=?'
                        }
                        alt={formatMediaTitle(entry.media, titleLang, shortTitles)}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-mono text-slate-200">
                        Ch {entry.progress}/{total ?? '?'}
                      </span>
                    </Link>

                    <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                      <Link
                        to={`/media/manga/${encodeURIComponent(resolveMediaId(entry.media))}`}
                        className="text-xs font-semibold text-slate-100 line-clamp-2 leading-snug"
                      >
                        {formatMediaTitle(entry.media, titleLang, shortTitles)}
                      </Link>
                      {canInc && (
                        <button
                          type="button"
                          onClick={() =>
                            updateEntry.mutate({
                              mediaId: entry.media.id,
                              type: 'MANGA',
                              progress: entry.progress + 1,
                              status:
                                total && entry.progress + 1 >= total
                                  ? 'COMPLETED'
                                  : entry.status,
                            })
                          }
                          className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 py-1.5 text-[11px] font-semibold text-indigo-300 active:scale-95 transition-transform cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />1 Ch
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Airing Soon Compact Rail */}
        {airingSoon.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400 animate-float-idle" />
                Airing Soon
              </h2>
              <Link
                to="/discover?tab=calendar"
                className="text-xs font-medium text-emerald-400"
              >
                Calendar →
              </Link>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x no-scrollbar">
              {airingSoon.map((item) => (
                <Link
                  key={item.id}
                  to={`/media/anime/${encodeURIComponent(resolveMediaId(item.media))}`}
                  className="min-w-[220px] shrink-0 snap-start flex items-center gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-2.5"
                >
                  <img
                    src={
                      item.media.coverUrl ||
                      'https://placehold.co/60x84/0f172a/64748b?text=?'
                    }
                    alt={formatMediaTitle(item.media, titleLang, shortTitles)}
                    className="h-14 w-10 rounded-lg object-cover shrink-0 bg-slate-800"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {formatMediaTitle(item.media, titleLang, shortTitles)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Ep {item.episode}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
                      in {formatCountdown(item.airingAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </MobileLayout>
  );
}
