import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Flame, Star, Tv } from 'lucide-react';
import {
  formatMediaTitle,
  useAuthStore,
  useMediaList,
  useProfileDetails,
  useSettingsStore,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';

export function RecapPage() {
  const session = useAuthStore((s) => s.session);
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const { data: animeList } = useMediaList('ANIME');
  const { data: mangaList } = useMediaList('MANGA');
  const { data: profileDetails } = useProfileDetails();

  const year = new Date().getFullYear();

  const recap = useMemo(() => {
    const anime = animeList ?? [];
    const manga = mangaList ?? [];

    const episodesWatched = anime.reduce((sum, e) => sum + e.progress, 0);
    const chaptersRead = manga.reduce((sum, e) => sum + e.progress, 0);
    const estimatedHours = Math.round((episodesWatched * 24) / 60);
    const completedAnime = anime.filter((e) => e.status === 'COMPLETED').length;
    const completedManga = manga.filter((e) => e.status === 'COMPLETED').length;

    const scored = [...anime, ...manga].filter((e) => e.score && e.score > 0);
    const meanScore =
      scored.length > 0
        ? Math.round(scored.reduce((s, e) => s + (e.score ?? 0), 0) / scored.length)
        : 0;

    const topRated = [...scored]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 6);

    const genreCounts: Record<string, number> = {};
    const formatCounts: Record<string, number> = {};
    for (const e of [...anime, ...manga]) {
      for (const g of e.media.genres) {
        genreCounts[g] = (genreCounts[g] ?? 0) + 1;
      }
      if (e.media.format) {
        formatCounts[e.media.format] = (formatCounts[e.media.format] ?? 0) + 1;
      }
    }

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const topFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'TV';

    const activeDays = (profileDetails?.activityHistory ?? []).filter((p) => p.amount > 0).length;

    return {
      totalAnime: anime.length,
      totalManga: manga.length,
      episodesWatched,
      chaptersRead,
      estimatedHours,
      completedAnime,
      completedManga,
      meanScore,
      topRated,
      topGenres,
      topFormat,
      activeDays,
    };
  }, [animeList, mangaList, profileDetails]);

  return (
    <DesktopLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Profile
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              {session?.user.name}&apos;s {year} Stats Recap
            </h1>
            <p className="text-sm text-slate-400">
              Your anime &amp; manga milestones at a glance.
            </p>
          </div>
        </div>

        {/* Headline Metric Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Tv className="h-4 w-4 text-sky-400" />
              Episodes Watched
            </div>
            <div className="text-3xl font-bold font-mono text-sky-400">
              {recap.episodesWatched}
            </div>
            <div className="text-xs text-slate-400">
              {recap.completedAnime} completed · {recap.totalAnime} tracked
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="h-4 w-4 text-emerald-400" />
              Estimated Watch Time
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-400">
              {recap.estimatedHours}h
            </div>
            <div className="text-xs text-slate-400">
              ~{Math.round(recap.estimatedHours / 24)} days total
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              Chapters Read
            </div>
            <div className="text-3xl font-bold font-mono text-indigo-400">
              {recap.chaptersRead}
            </div>
            <div className="text-xs text-slate-400">
              {recap.completedManga} completed · {recap.totalManga} tracked
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Flame className="h-4 w-4 text-amber-400" />
              Mean Score &amp; Format
            </div>
            <div className="text-3xl font-bold font-mono text-amber-300">
              {recap.meanScore ? `${recap.meanScore}%` : '—'}
            </div>
            <div className="text-xs text-slate-400">
              Top format: {recap.topFormat}
              {recap.activeDays > 0 ? ` · ${recap.activeDays} active days` : ''}
            </div>
          </div>
        </section>

        {/* Top Genres */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">Signature Genres</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {recap.topGenres.map(([genre, count], idx) => (
              <div
                key={genre}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-center space-y-1"
              >
                <div className="text-[10px] font-mono text-sky-400">#{idx + 1}</div>
                <div className="text-sm font-semibold text-slate-100 truncate">
                  {genre}
                </div>
                <div className="text-xs font-mono text-slate-400">{count} titles</div>
              </div>
            ))}
          </div>
        </section>

        {/* Highest Rated Picks */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">Highest Rated Picks</h2>
          {recap.topRated.length === 0 ? (
            <p className="text-xs text-slate-400">Score titles on your list to feature them here.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {recap.topRated.map((entry) => {
                const title = formatMediaTitle(entry.media, titleLang);
                return (
                  <Link
                    key={entry.media.id}
                    to={`/media/${entry.media.type.toLowerCase()}/${encodeURIComponent(entry.media.id)}`}
                    className="group rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden hover:border-sky-500/40 transition-colors"
                  >
                    <div className="relative aspect-[3/4] bg-slate-800 overflow-hidden">
                      {entry.media.coverUrl && (
                        <img
                          src={entry.media.coverUrl}
                          alt={title}
                          loading="lazy"
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      {entry.score && (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                          <Star className="h-2.5 w-2.5 fill-amber-300" />
                          {entry.score}%
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 text-xs font-medium text-slate-100 line-clamp-2 group-hover:text-sky-300">
                      {title}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DesktopLayout>
  );
}
