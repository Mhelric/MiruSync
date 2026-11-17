import { useMemo } from 'react';
import { BookOpen, Star, Tv } from 'lucide-react';
import { useAuthStore, useMediaList, type ListStatus } from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';

const STATUS_LABELS: { key: ListStatus; label: string; color: string }[] = [
  { key: 'CURRENT', label: 'Watching / Reading', color: 'bg-sky-500' },
  { key: 'COMPLETED', label: 'Completed', color: 'bg-emerald-500' },
  { key: 'PLANNING', label: 'Plan to Watch / Read', color: 'bg-indigo-500' },
  { key: 'PAUSED', label: 'On Hold', color: 'bg-amber-500' },
  { key: 'DROPPED', label: 'Dropped', color: 'bg-rose-500' },
];

export function ProfilePage() {
  const session = useAuthStore((s) => s.session);
  const { data: animeList } = useMediaList('ANIME');
  const { data: mangaList } = useMediaList('MANGA');

  const stats = useMemo(() => {
    const anime = animeList ?? [];
    const manga = mangaList ?? [];

    const episodesWatched = anime.reduce((sum, e) => sum + e.progress, 0);
    const chaptersRead = manga.reduce((sum, e) => sum + e.progress, 0);

    const scored = [...anime, ...manga].filter((e) => e.score && e.score > 0);
    const meanScore =
      scored.length > 0
        ? Math.round(scored.reduce((s, e) => s + (e.score ?? 0), 0) / scored.length)
        : 0;

    const statusCounts: Record<string, number> = {};
    for (const e of [...anime, ...manga]) {
      statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;
    }

    const genreCounts: Record<string, number> = {};
    for (const e of [...anime, ...manga]) {
      for (const g of e.media.genres) {
        genreCounts[g] = (genreCounts[g] ?? 0) + 1;
      }
    }
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      totalAnime: anime.length,
      totalManga: manga.length,
      episodesWatched,
      chaptersRead,
      meanScore,
      totalEntries: anime.length + manga.length,
      statusCounts,
      topGenres,
    };
  }, [animeList, mangaList]);

  return (
    <DesktopLayout>
      <div className="space-y-6">
        {/* Header Card */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 flex flex-wrap items-center gap-5">
          {session?.user.avatarUrl ? (
            <img
              src={session.user.avatarUrl}
              alt={session.user.name}
              className="h-20 w-20 rounded-full object-cover border-2 border-sky-500/40"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-400">
              {session?.user.name.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold">{session?.user.name}</h1>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-mono text-sky-400 uppercase">
                {session?.provider === 'mal' ? 'MyAnimeList' : 'AniList'}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              ID: {session?.user.id}
            </p>
          </div>
        </section>

        {/* Stat Tiles */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Tv className="h-3.5 w-3.5 text-sky-400" />
              Anime
            </div>
            <div className="mt-1 text-2xl font-bold font-mono">{stats.totalAnime}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-xs text-slate-400">Episodes Watched</div>
            <div className="mt-1 text-2xl font-bold font-mono text-sky-400">
              {stats.episodesWatched}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              Manga
            </div>
            <div className="mt-1 text-2xl font-bold font-mono">{stats.totalManga}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-xs text-slate-400">Chapters Read</div>
            <div className="mt-1 text-2xl font-bold font-mono text-indigo-400">
              {stats.chaptersRead}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              Mean Score
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-300">
              {stats.meanScore ? `${stats.meanScore}%` : '—'}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200">
              Status Distribution
            </h2>
            <div className="space-y-3">
              {STATUS_LABELS.map(({ key, label, color }) => {
                const count = stats.statusCounts[key] ?? 0;
                const pct =
                  stats.totalEntries > 0
                    ? Math.round((count / stats.totalEntries) * 100)
                    : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{label}</span>
                      <span className="font-mono text-slate-400">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Top Genres */}
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200">Top Genres</h2>
            {stats.topGenres.length === 0 ? (
              <p className="text-xs text-slate-500">No genre data yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.topGenres.map(([genre, count]) => (
                  <span
                    key={genre}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-200"
                  >
                    {genre}
                    <span className="font-mono text-sky-400">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </DesktopLayout>
  );
}
