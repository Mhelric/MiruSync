import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import {
  Award,
  Bell,
  BellOff,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Film,
  Plus,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  formatCountdown,
  formatMediaTitle,
  useAuthStore,
  useDeleteEntry,
  useFollowedTitles,
  useLocalPrefsStore,
  useMangaDexChapters,
  useMediaDetail,
  useMediaList,
  useSettingsStore,
  useUpdateEntry,
  type ListEntry,
  type MediaType,
} from '@mirusync/core';
import { MobileLayout } from '../layouts/MobileLayout';
import { MobileEditEntryModal } from '../components/MobileEditEntryModal';
import { API_BASE } from '../lib/mobileAuth';

export function MobileMediaDetailPage() {
  const { type: rawType, id: rawId } = useParams<{ type: string; id: string }>();
  const session = useAuthStore((s) => s.session);
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const shortTitles = useLocalPrefsStore((s) => s.shortTitles);

  const type: MediaType = rawType?.toUpperCase() === 'MANGA' ? 'MANGA' : 'ANIME';
  const id = rawId ? decodeURIComponent(rawId) : undefined;

  const { data: media, isLoading, isError } = useMediaDetail(id, type, API_BASE);
  const { data: list } = useMediaList(type, undefined, API_BASE);
  const updateEntry = useUpdateEntry(API_BASE);
  const deleteEntry = useDeleteEntry(API_BASE);
  const { isFollowing, toggleFollow } = useFollowedTitles(API_BASE);
  const mangaSearchTitle =
    type === 'MANGA' ? media?.title.english || media?.title.romaji : undefined;
  const { data: mangaDexData } = useMangaDexChapters(
    mangaSearchTitle,
    type === 'MANGA' && Boolean(mangaSearchTitle),
    API_BASE
  );

  const [editing, setEditing] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [showAltTitles, setShowAltTitles] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showSpoilerTags, setShowSpoilerTags] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [detailModal, setDetailModal] = useState<'relations' | 'characters' | null>(
    null
  );

  const existingEntry: ListEntry | undefined = list?.find(
    (e) =>
      e.media.id === id ||
      (media?.alId && e.media.alId === media.alId) ||
      (media?.malId && e.media.malId === media.malId)
  );

  function resolveTargetId(item: { id: string; malId?: number }) {
    if (session?.provider === 'mal' && item.malId) {
      return `mal:${item.malId}`;
    }
    return item.id;
  }

  function handleQuickAdd() {
    if (!media) return;
    updateEntry.mutate({
      mediaId: media.id,
      type,
      status: 'CURRENT',
      progress: 0,
    });
  }

  const visibleTags = (media?.tags ?? []).filter(
    (t) => showSpoilerTags || !t.isSpoiler
  );

  const displayTitle = media
    ? formatMediaTitle(media, titleLang, shortTitles)
    : 'Details';
  const cleanSynopsis = media?.synopsis
    ? media.synopsis.replace(/<[^>]+>/g, '').trim()
    : '';
  const isLongSynopsis = cleanSynopsis.length > 240;

  return (
    <MobileLayout title={displayTitle} showBack hideBottomNav>
      {isLoading ? (
        <div className="h-80 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      ) : isError || !media ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-xs text-rose-300">
          Failed to load media details.
        </div>
      ) : (
        <div className="space-y-5">
          {media.bannerUrl && (
            <div className="h-36 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 relative">
              <img
                src={media.bannerUrl}
                alt={displayTitle}
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
            </div>
          )}

          {/* Header Poster + Title */}
          <div
            className={`flex gap-3.5 items-end ${
              media.bannerUrl ? '-mt-12 px-2 relative z-10' : ''
            }`}
          >
            <img
              src={
                media.coverUrl ||
                'https://placehold.co/240x360/0f172a/64748b?text=?'
              }
              alt={displayTitle}
              className="w-24 aspect-[2/3] rounded-xl border border-slate-700/80 object-cover shadow-2xl shrink-0 bg-slate-900"
            />
            <div className="min-w-0 flex-1 pb-0.5">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-300 mb-1">
                <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-sky-400">
                  {media.format ?? media.type}
                </span>
                {media.status && (
                  <span className="text-slate-400">
                    {media.status.replace(/_/g, ' ')}
                  </span>
                )}
                {media.averageScore && (
                  <span className="inline-flex items-center gap-0.5 text-amber-300 font-semibold">
                    <Star className="h-3 w-3 fill-amber-300" />
                    {media.averageScore}%
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold tracking-tight leading-snug line-clamp-2">
                {displayTitle}
              </h1>
              {media.title.english && media.title.english !== displayTitle && (
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {media.title.english}
                </p>
              )}
            </div>
          </div>

          {/* Inline Tracking Bar */}
          {existingEntry ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-sky-400">
                  {existingEntry.status}
                </div>
                <div className="text-sm font-mono font-semibold text-slate-100">
                  {existingEntry.progress} /{' '}
                  {(type === 'ANIME' ? media.episodes : media.chapters) ?? '?'}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    updateEntry.mutate({
                      mediaId: existingEntry.media.id,
                      type,
                      progress: existingEntry.progress + 1,
                    })
                  }
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-semibold text-slate-950 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />1
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-200 cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleQuickAdd}
              className="w-full rounded-2xl bg-sky-500 py-3 text-sm font-semibold text-slate-950 cursor-pointer"
            >
              + Add to List
            </button>
          )}

          {/* Release Alerts Toggle */}
          {(() => {
            const following = isFollowing(media.id);
            const latestChapter = mangaDexData?.chapters?.[0]?.chapter ?? null;
            return (
              <button
                type="button"
                disabled={toggleFollow.isPending}
                onClick={() =>
                  toggleFollow.mutate({
                    media,
                    currentlyFollowing: following,
                    latestChapter,
                  })
                }
                className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl border py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                  following
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-800 bg-slate-900/70 text-slate-200'
                }`}
              >
                {following ? (
                  <>
                    <Bell className="h-3.5 w-3.5" />
                    Release Alerts On
                  </>
                ) : (
                  <>
                    <BellOff className="h-3.5 w-3.5" />
                    {type === 'MANGA' ? 'Follow Chapter Alerts' : 'Follow Episode Alerts'}
                  </>
                )}
              </button>
            );
          })()}

          {/* Airing Countdown */}
          {media.nextAiring && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-300">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                Ep {media.nextAiring.episode} airing in{' '}
                <strong className="font-mono">
                  {formatCountdown(media.nextAiring.airingAt)}
                </strong>
              </span>
            </div>
          )}

          {/* Genres */}
          {media.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {media.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-0.5 text-xs text-slate-200"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          {cleanSynopsis && (
            <div className="space-y-1.5">
              <p
                className={`text-sm text-slate-300 leading-relaxed whitespace-pre-line ${
                  !synopsisExpanded && isLongSynopsis ? 'line-clamp-4' : ''
                }`}
              >
                {cleanSynopsis}
              </p>
              {isLongSynopsis && (
                <button
                  type="button"
                  onClick={() => setSynopsisExpanded((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 cursor-pointer"
                >
                  {synopsisExpanded ? (
                    <>
                      Show less <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      Read more <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Latest MangaDex Chapters */}
          {type === 'MANGA' && mangaDexData && mangaDexData.chapters.length > 0 && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                  Latest Chapters (MangaDex)
                </h3>
                {mangaDexData.mangaId && (
                  <button
                    type="button"
                    onClick={() =>
                      void Browser.open({
                        url: `https://mangadex.org/title/${mangaDexData.mangaId}`,
                      })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 cursor-pointer"
                  >
                    Open
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {mangaDexData.chapters.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => void Browser.open({ url: ch.url })}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-left text-xs active:scale-[0.99] transition-transform cursor-pointer"
                  >
                    <div className="min-w-0 truncate">
                      <span className="font-semibold text-sky-400 font-mono">
                        Ch. {ch.chapter}
                      </span>
                      {ch.title && (
                        <span className="ml-2 text-slate-200">{ch.title}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {new Date(ch.publishedAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rankings */}
          {media.rankings && media.rankings.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {media.rankings.slice(0, 6).map((r, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                    r.type === 'RATED'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                  }`}
                >
                  {r.type === 'RATED' ? (
                    <Award className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  )}
                  #{r.rank} {r.context}
                </span>
              ))}
            </div>
          )}

          {/* 2-Col Metadata Grid */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3.5 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {media.format && (
                <div>
                  <div className="text-slate-400 font-mono uppercase text-[10px]">
                    Format
                  </div>
                  <div className="text-slate-200 font-medium mt-0.5">
                    {media.format}
                  </div>
                </div>
              )}
              {media.status && (
                <div>
                  <div className="text-slate-400 font-mono uppercase text-[10px]">
                    Status
                  </div>
                  <div className="text-slate-200 font-medium mt-0.5">
                    {media.status.replace(/_/g, ' ')}
                  </div>
                </div>
              )}
              <div>
                <div className="text-slate-400 font-mono uppercase text-[10px]">
                  {type === 'ANIME' ? 'Episodes' : 'Chapters'}
                </div>
                <div className="text-slate-200 font-medium mt-0.5">
                  {(type === 'ANIME' ? media.episodes : media.chapters) ?? 'Ongoing'}
                </div>
              </div>
              {media.season && media.seasonYear && (
                <div>
                  <div className="text-slate-400 font-mono uppercase text-[10px]">
                    Season
                  </div>
                  <div className="text-slate-200 font-medium mt-0.5">
                    {media.season} {media.seasonYear}
                  </div>
                </div>
              )}
            </div>

            {media.studios && media.studios.length > 0 && (
              <div className="pt-2 border-t border-slate-800/70">
                <div className="text-slate-400 font-mono uppercase text-[10px]">
                  Studios
                </div>
                <div className="text-slate-200 font-medium mt-0.5">
                  {media.studios.join(', ')}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800/70">
              <button
                type="button"
                onClick={() => setShowAltTitles((v) => !v)}
                className="flex w-full items-center justify-between text-[10px] font-mono uppercase text-slate-400 cursor-pointer"
              >
                <span>Alternative Titles</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${
                    showAltTitles ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  showAltTitles ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="mt-2 space-y-1 text-[11px]">
                    {media.title.romaji && (
                      <p className="text-slate-300">Romaji: {media.title.romaji}</p>
                    )}
                    {media.title.english && (
                      <p className="text-slate-300">English: {media.title.english}</p>
                    )}
                    {media.title.native && (
                      <p className="text-slate-300">Native: {media.title.native}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Tags */}
          {media.tags && media.tags.length > 0 && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowTags((v) => !v)}
                  className="flex flex-1 items-center justify-between text-xs font-mono uppercase text-slate-400 cursor-pointer"
                >
                  <span>Tags ({visibleTags.length})</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-300 ${
                      showTags ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {showTags && media.tags.some((t) => t.isSpoiler) && (
                  <button
                    type="button"
                    onClick={() => setShowSpoilerTags((s) => !s)}
                    className="text-[11px] text-sky-400 cursor-pointer"
                  >
                    {showSpoilerTags ? 'Hide spoilers' : 'Show spoilers'}
                  </button>
                )}
              </div>
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  showTags ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-wrap gap-1.5 pt-2.5">
                    {visibleTags.slice(0, 14).map((t) => (
                      <span
                        key={t.name}
                        className={`rounded-md border px-2 py-0.5 text-[11px] ${
                          t.isSpoiler
                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                            : 'border-slate-800 bg-slate-950/60 text-slate-300'
                        }`}
                      >
                        {t.name}
                        {t.rank ? ` · ${t.rank}%` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expandable Where to Watch & Links */}
          {media.streamingLinks && media.streamingLinks.length > 0 && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3.5">
              <button
                type="button"
                onClick={() => setShowLinks((v) => !v)}
                className="flex w-full items-center justify-between text-xs font-mono uppercase text-slate-400 cursor-pointer"
              >
                <span>
                  {type === 'ANIME' ? 'Where to Watch & Links' : 'External Links'} (
                  {media.streamingLinks.length})
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ${
                    showLinks ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  showLinks ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-wrap gap-2 pt-2.5">
                    {media.streamingLinks.map((link) => (
                      <button
                        key={link.url}
                        type="button"
                        onClick={() => void Browser.open({ url: link.url })}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200 cursor-pointer"
                      >
                        <span>{link.site}</span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trailer */}
          {media.trailer?.site === 'youtube' && media.trailer.id && (
            <div className="space-y-2">
              <h2 className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-sky-400" />
                Trailer
              </h2>
              <div className="aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                <iframe
                  title="Trailer"
                  src={`https://www.youtube.com/embed/${media.trailer.id}`}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Relations */}
          {media.relations && media.relations.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-400" />
                  Relations
                </h2>
                <button
                  type="button"
                  onClick={() => setDetailModal('relations')}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-sky-400 cursor-pointer"
                >
                  View all ({media.relations.length})
                </button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x no-scrollbar">
                {media.relations.map((rel) => (
                  <Link
                    key={`${rel.relationType}-${rel.id}`}
                    to={`/media/${rel.type.toLowerCase()}/${encodeURIComponent(
                      resolveTargetId(rel)
                    )}`}
                    className="min-w-[230px] shrink-0 snap-start flex gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-2.5"
                  >
                    <img
                      src={
                        rel.coverUrl ||
                        'https://placehold.co/60x84/0f172a/64748b?text=?'
                      }
                      alt={formatMediaTitle(rel, titleLang, shortTitles)}
                      className="h-16 w-12 rounded-lg object-cover shrink-0 bg-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono uppercase text-sky-400">
                        {rel.relationType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs font-semibold text-slate-100 line-clamp-2 mt-0.5">
                        {formatMediaTitle(rel, titleLang, shortTitles)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Characters & Voice Actors */}
          {media.characters && media.characters.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-400" />
                  Characters {type === 'ANIME' ? '& VA' : ''}
                </h2>
                <button
                  type="button"
                  onClick={() => setDetailModal('characters')}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-indigo-400 cursor-pointer"
                >
                  View all ({media.characters.length})
                </button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x no-scrollbar">
                {media.characters.map((ch) => (
                  <div
                    key={ch.id}
                    className="min-w-[255px] shrink-0 snap-start flex items-center justify-between gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={
                          ch.imageUrl ||
                          'https://placehold.co/48x64/0f172a/64748b?text=?'
                        }
                        alt={ch.name}
                        className="h-12 w-9 rounded-lg object-cover shrink-0 bg-slate-800"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          {ch.name}
                        </div>
                        {ch.role && (
                          <div className="text-[10px] font-mono text-slate-400">
                            {ch.role}
                          </div>
                        )}
                      </div>
                    </div>
                    {ch.voiceActor && (
                      <div className="flex items-center gap-2 text-right min-w-0">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-200 truncate">
                            {ch.voiceActor.name}
                          </div>
                          <div className="text-[10px] text-slate-500">JP</div>
                        </div>
                        {ch.voiceActor.imageUrl && (
                          <img
                            src={ch.voiceActor.imageUrl}
                            alt={ch.voiceActor.name}
                            className="h-12 w-9 rounded-lg object-cover shrink-0 bg-slate-800"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {media.recommendations && media.recommendations.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-sm font-bold">Recommendations</h2>
              <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x no-scrollbar">
                {media.recommendations.map((rec) => (
                  <Link
                    key={rec.id}
                    to={`/media/${rec.type.toLowerCase()}/${encodeURIComponent(
                      resolveTargetId(rec)
                    )}`}
                    className="w-28 shrink-0 snap-start rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-[3/4] bg-slate-900">
                      <img
                        src={
                          rec.coverUrl ||
                          'https://placehold.co/180x260/0f172a/64748b?text=?'
                        }
                        alt={formatMediaTitle(rec, titleLang, shortTitles)}
                        className="h-full w-full object-cover"
                      />
                      {rec.averageScore && (
                        <span className="absolute top-1.5 right-1.5 rounded bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                          {rec.averageScore}%
                        </span>
                      )}
                    </div>
                    <div className="p-2 text-[11px] font-medium text-slate-200 line-clamp-2">
                      {formatMediaTitle(rec, titleLang, shortTitles)}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {editing && existingEntry && (
        <MobileEditEntryModal
          entry={existingEntry}
          onClose={() => setEditing(false)}
          onSave={(update) => updateEntry.mutate(update)}
          onDelete={(mediaId) => deleteEntry.mutate({ mediaId, type })}
        />
      )}

      {detailModal && media && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="w-full max-w-lg max-h-[82vh] rounded-t-3xl border-t border-slate-800 bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100">
                {detailModal === 'relations'
                  ? `All Relations (${media.relations?.length ?? 0})`
                  : `All Characters (${media.characters?.length ?? 0})`}
              </h3>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2.5">
              {detailModal === 'relations'
                ? (media.relations ?? []).map((rel) => (
                    <Link
                      key={`${rel.relationType}-${rel.id}`}
                      to={`/media/${rel.type.toLowerCase()}/${encodeURIComponent(
                        resolveTargetId(rel)
                      )}`}
                      onClick={() => setDetailModal(null)}
                      className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-2.5"
                    >
                      <img
                        src={
                          rel.coverUrl ||
                          'https://placehold.co/60x84/0f172a/64748b?text=?'
                        }
                        alt={formatMediaTitle(rel, titleLang, shortTitles)}
                        className="h-14 w-10 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono uppercase text-sky-400">
                          {rel.relationType.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs font-semibold text-slate-100 line-clamp-2">
                          {formatMediaTitle(rel, titleLang, shortTitles)}
                        </div>
                      </div>
                    </Link>
                  ))
                : (media.characters ?? []).map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            ch.imageUrl ||
                            'https://placehold.co/48x64/0f172a/64748b?text=?'
                          }
                          alt={ch.name}
                          className="h-12 w-9 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100 truncate">
                            {ch.name}
                          </div>
                          {ch.role && (
                            <div className="text-[10px] font-mono text-slate-400">
                              {ch.role}
                            </div>
                          )}
                        </div>
                      </div>
                      {ch.voiceActor && (
                        <div className="flex items-center gap-2 text-right min-w-0">
                          <div className="min-w-0">
                            <div className="text-xs text-slate-200 truncate">
                              {ch.voiceActor.name}
                            </div>
                            <div className="text-[10px] text-slate-500">JP</div>
                          </div>
                          {ch.voiceActor.imageUrl && (
                            <img
                              src={ch.voiceActor.imageUrl}
                              alt={ch.voiceActor.name}
                              className="h-12 w-9 rounded-lg object-cover shrink-0"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
