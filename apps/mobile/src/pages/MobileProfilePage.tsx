import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, LogOut, Sparkles, Star, Tv } from 'lucide-react';
import {
  formatMediaTitle,
  useAuthStore,
  useLocalPrefsStore,
  useMediaList,
  useProfileDetails,
  useSettingsStore,
} from '@mirusync/core';
import { MobileLayout } from '../layouts/MobileLayout';
import { AniListIcon, MalIcon } from '../components/BrandIcons';
import { API_BASE, saveMobileSession } from '../lib/mobileAuth';

export function MobileProfilePage() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const shortTitles = useLocalPrefsStore((s) => s.shortTitles);

  const { data: animeList } = useMediaList('ANIME', undefined, API_BASE);
  const { data: mangaList } = useMediaList('MANGA', undefined, API_BASE);
  const { data: profileDetails } = useProfileDetails(API_BASE);

  const stats = useMemo(() => {
    const anime = animeList ?? [];
    const manga = mangaList ?? [];
    const episodesWatched = anime.reduce((sum, e) => sum + e.progress, 0);
    const chaptersRead = manga.reduce((sum, e) => sum + e.progress, 0);
    const scored = [...anime, ...manga].filter((e) => (e.score ?? 0) > 0);
    const meanScore =
      scored.length > 0
        ? Math.round(
            scored.reduce((sum, e) => sum + (e.score ?? 0), 0) / scored.length
          )
        : 0;
    return {
      totalAnime: anime.length,
      totalManga: manga.length,
      episodesWatched,
      chaptersRead,
      meanScore,
    };
  }, [animeList, mangaList]);

  const recentFavorites = useMemo(() => {
    const animeFavs = profileDetails?.favorites.anime ?? [];
    const mangaFavs = profileDetails?.favorites.manga ?? [];
    return [...animeFavs, ...mangaFavs].slice(0, 12);
  }, [profileDetails]);

  const recentUpdates = useMemo(() => {
    return [...(animeList ?? []), ...(mangaList ?? [])]
      .filter((e) => e.updatedAt)
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, 8);
  }, [animeList, mangaList]);

  function resolveMediaId(item: { id: string; malId?: number }) {
    if (session?.provider === 'mal' && item.malId) {
      return `mal:${item.malId}`;
    }
    return item.id;
  }

  function handleSignOut() {
    saveMobileSession(null);
    setSession(null);
  }

  return (
    <MobileLayout title="Profile">
      <div className="space-y-5">
        {/* Profile Header Card */}
        <section className="rounded-3xl border border-slate-800/80 bg-slate-900/60 overflow-hidden">
          {profileDetails?.bannerUrl && (
            <div className="h-28 relative bg-slate-900">
              <img
                src={profileDetails.bannerUrl}
                alt="Profile banner"
                className="h-full w-full object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
            </div>
          )}

          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3.5">
              {session?.user.avatarUrl ? (
                <img
                  src={session.user.avatarUrl}
                  alt={session.user.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-slate-700 shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-300 shrink-0">
                  {session?.user.name.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold truncate">{session?.user.name}</h1>
                  {session?.provider === 'mal' ? (
                    <MalIcon className="h-4 w-4 rounded-[4px] shrink-0" />
                  ) : (
                    <AniListIcon className="h-4 w-4 rounded-[4px] shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-300 cursor-pointer"
                  >
                    <LogOut className="h-3 w-3" />
                    Sign Out
                  </button>
                </div>

                {profileDetails?.about && (
                  <p className="text-xs text-slate-300 line-clamp-2 mt-1">
                    {profileDetails.about}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Stat Tiles (Mean Score spans full width on 2-col mobile grid) */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Tv className="h-3.5 w-3.5 text-sky-400" />
              Anime
            </div>
            <div className="mt-1 text-2xl font-bold font-mono">{stats.totalAnime}</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5">
            <div className="text-xs text-slate-400">Episodes Watched</div>
            <div className="mt-1 text-2xl font-bold font-mono text-sky-400">
              {stats.episodesWatched}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              Manga
            </div>
            <div className="mt-1 text-2xl font-bold font-mono">{stats.totalManga}</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5">
            <div className="text-xs text-slate-400">Chapters Read</div>
            <div className="mt-1 text-2xl font-bold font-mono text-indigo-400">
              {stats.chaptersRead}
            </div>
          </div>

          <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
              <Star className="h-4 w-4 text-amber-400" />
              Mean Score
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300">
              {stats.meanScore ? `${stats.meanScore}%` : '—'}
            </div>
          </div>
        </section>

        {/* Favorites Horizontal Rail */}
        {recentFavorites.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Favorites
            </h2>
            <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x no-scrollbar">
              {recentFavorites.map((fav) => {
                const favType = fav.mediaType ?? (fav.kind === 'MANGA' ? 'MANGA' : 'ANIME');
                return (
                  <Link
                    key={fav.id}
                    to={`/media/${favType.toLowerCase()}/${encodeURIComponent(fav.id)}`}
                    className="w-28 shrink-0 snap-start rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[3/4] bg-slate-900">
                      <img
                        src={
                          fav.imageUrl ||
                          'https://placehold.co/180x260/0f172a/64748b?text=?'
                        }
                        alt={fav.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-2 text-[11px] font-medium text-slate-200 line-clamp-2">
                      {fav.title}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Updates */}
        {recentUpdates.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-sm font-bold">Recent Activity</h2>
            <div className="space-y-2">
              {recentUpdates.map((entry) => (
                <Link
                  key={`${entry.media.type}-${entry.media.id}`}
                  to={`/media/${entry.media.type.toLowerCase()}/${encodeURIComponent(
                    resolveMediaId(entry.media)
                  )}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-2.5"
                >
                  <img
                    src={
                      entry.media.coverUrl ||
                      'https://placehold.co/60x84/0f172a/64748b?text=?'
                    }
                    alt={formatMediaTitle(entry.media, titleLang, shortTitles)}
                    className="h-12 w-9 rounded-lg object-cover shrink-0 bg-slate-800"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {formatMediaTitle(entry.media, titleLang, shortTitles)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {entry.status} ·{' '}
                      {entry.media.type === 'ANIME' ? 'Ep' : 'Ch'} {entry.progress}
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
