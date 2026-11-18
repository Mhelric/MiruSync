import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
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
  useMediaDetail,
  useMediaList,
  useSettingsStore,
  useUpdateEntry,
  type ListEntry,
  type MediaType,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';
import { EditEntryModal } from '../components/EditEntryModal';
import { ExternalSiteIcon } from '../components/BrandIcons';

export function MediaDetailPage() {
  const { type: rawType, id: rawId } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const titleLang = useSettingsStore((s) => s.settings.title_language);

  const type: MediaType = rawType?.toUpperCase() === 'MANGA' ? 'MANGA' : 'ANIME';
  const id = rawId ? decodeURIComponent(rawId) : undefined;

  const { data: media, isLoading, isError } = useMediaDetail(id, type);
  const { data: list } = useMediaList(type);
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  const [editing, setEditing] = useState(false);
  const [showSpoilerTags, setShowSpoilerTags] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [showAltTitles, setShowAltTitles] = useState(false);
  const [showTagsMobile, setShowTagsMobile] = useState(false);
  const [showLinksMobile, setShowLinksMobile] = useState(false);
  const [detailModal, setDetailModal] = useState<'relations' | 'characters' | null>(null);

  const existingEntry: ListEntry | undefined = list?.find(
    (e) => e.media.id === id || (media?.alId && e.media.alId === media.alId) || (media?.malId && e.media.malId === media.malId)
  );

  function handleQuickAdd() {
    if (!media) return;
    updateEntry.mutate({
      mediaId: media.id,
      type,
      status: 'CURRENT',
      progress: 0,
    });
  }

  function resolveTargetId(item: { id: string; malId?: number }) {
    if (session?.provider === 'mal' && item.malId) {
      return `mal:${item.malId}`;
    }
    return item.id;
  }

  const visibleTags = (media?.tags ?? []).filter(
    (t) => showSpoilerTags || !t.isSpoiler
  );

  return (
    <DesktopLayout>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 mb-4 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {isLoading ? (
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      ) : isError || !media ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
          Failed to load media details.
        </div>
      ) : (() => {
        const displayTitle = formatMediaTitle(media, titleLang);
        const coverSrc =
          media.coverUrl ||
          'https://placehold.co/300x420/0f172a/64748b?text=No+Cover';
        const cleanSynopsis = media.synopsis
          ? media.synopsis.replace(/<[^>]+>/g, '').trim()
          : '';
        const isLongSynopsis = cleanSynopsis.length > 260;

        const airingBanner = media.nextAiring ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-300">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              Ep {media.nextAiring.episode} airing in{' '}
              <strong className="font-mono">
                {formatCountdown(media.nextAiring.airingAt)}
              </strong>
              <span className="hidden sm:inline">
                {' '}
                ({new Date(media.nextAiring.airingAt * 1000).toLocaleString()})
              </span>
            </span>
          </div>
        ) : media.status === 'FINISHED' ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-2 text-xs text-slate-300">
            Finished {type === 'ANIME' ? 'Airing' : 'Publishing'}
          </div>
        ) : null;

        const rankingsBlock =
          media.rankings && media.rankings.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {media.rankings.slice(0, 6).map((r, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] sm:text-xs font-medium ${
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
                  {r.year ? ` (${r.year})` : ''}
                </span>
              ))}
            </div>
          ) : null;

        const genresBlock =
          media.genres.length > 0 ? (
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
          ) : null;

        const synopsisBlock = cleanSynopsis ? (
          <div className="space-y-1.5">
            <p
              className={`text-sm text-slate-300 leading-relaxed whitespace-pre-line ${
                !synopsisExpanded && isLongSynopsis ? 'line-clamp-4 md:line-clamp-none' : ''
              }`}
            >
              {cleanSynopsis}
            </p>
            {isLongSynopsis && (
              <button
                type="button"
                onClick={() => setSynopsisExpanded((v) => !v)}
                className="md:hidden inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 cursor-pointer"
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
        ) : null;

        const tagsBlock =
          media.tags && media.tags.length > 0 ? (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 md:rounded-none md:border-0 md:bg-transparent md:p-0 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowTagsMobile((v) => !v)}
                  className="md:pointer-events-none flex flex-1 items-center justify-between text-xs font-mono uppercase text-slate-400 cursor-pointer md:cursor-default"
                >
                  <span>Tags ({visibleTags.length})</span>
                  <span className="md:hidden">
                    {showTagsMobile ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>
                {media.tags.some((t) => t.isSpoiler) && (
                  <button
                    type="button"
                    onClick={() => setShowSpoilerTags((s) => !s)}
                    className={`${
                      showTagsMobile ? 'inline-block' : 'hidden md:inline-block'
                    } text-[11px] text-sky-400 hover:underline cursor-pointer`}
                  >
                    {showSpoilerTags ? 'Hide spoilers' : 'Show spoilers'}
                  </button>
                )}
              </div>
              <div
                className={`${
                  showTagsMobile ? 'flex' : 'hidden md:flex'
                } flex-wrap gap-1.5`}
              >
                {visibleTags.slice(0, 14).map((t) => (
                  <span
                    key={t.name}
                    className={`rounded-md border px-2 py-0.5 text-[11px] ${
                      t.isSpoiler
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        : 'border-slate-800 bg-slate-900/70 text-slate-300'
                    }`}
                  >
                    {t.name}
                    {t.rank ? ` · ${t.rank}%` : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : null;

        const linksBlock =
          media.streamingLinks && media.streamingLinks.length > 0 ? (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 md:rounded-none md:border-0 md:bg-transparent md:p-0 space-y-2.5">
              <button
                type="button"
                onClick={() => setShowLinksMobile((v) => !v)}
                className="md:pointer-events-none flex w-full items-center justify-between text-xs font-mono uppercase text-slate-400 cursor-pointer md:cursor-default"
              >
                <span>
                  {type === 'ANIME' ? 'Where to Watch & Links' : 'External Links'} (
                  {media.streamingLinks.length})
                </span>
                <span className="md:hidden">
                  {showLinksMobile ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>
              <div
                className={`${
                  showLinksMobile ? 'flex' : 'hidden md:flex'
                } flex-wrap gap-2`}
              >
                {media.streamingLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-600 px-3 py-1.5 text-xs text-slate-200 transition-colors"
                  >
                    <ExternalSiteIcon site={link.site} className="h-4 w-4" />
                    <span>{link.site}</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          ) : null;

        const trailerBlock =
          media.trailer?.site === 'youtube' && media.trailer.id ? (
            <div>
              <h2 className="text-xs font-mono uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-sky-400" />
                Trailer
              </h2>
              <div className="aspect-video max-w-xl rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                <iframe
                  title="Trailer"
                  src={`https://www.youtube.com/embed/${media.trailer.id}`}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
            </div>
          ) : null;

        return (
        <div className="space-y-6 md:space-y-8">
          {media.bannerUrl && (
            <div className="h-32 sm:h-44 md:h-52 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 relative">
              <img
                src={media.bannerUrl}
                alt={displayTitle}
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
            </div>
          )}

          {/* Mobile Compact Hero & Organized Layout (< md) */}
          <div className="md:hidden space-y-4">
            <div
              className={`flex gap-3.5 items-end ${
                media.bannerUrl ? '-mt-12 px-2 relative z-10' : ''
              }`}
            >
              <img
                src={coverSrc}
                alt={displayTitle}
                className="w-24 sm:w-28 aspect-[2/3] rounded-xl border border-slate-700/80 object-cover shadow-2xl shrink-0 bg-slate-900"
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
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug line-clamp-2">
                  {displayTitle}
                </h1>
                {media.title.english && media.title.english !== displayTitle && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {media.title.english}
                  </p>
                )}
              </div>
            </div>

            {/* Mobile Compact Tracking Bar */}
            {existingEntry ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400">
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
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 hover:bg-sky-400 px-3.5 py-2 text-xs font-semibold text-slate-950 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />1
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-lg border border-slate-700 hover:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleQuickAdd}
                className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 py-2.5 text-sm font-semibold text-slate-950 transition-colors cursor-pointer"
              >
                + Add to List
              </button>
            )}

            {airingBanner}
            {genresBlock}
            {synopsisBlock}
            {rankingsBlock}

            {/* Mobile 2-Column Metadata Grid */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 space-y-3 text-xs">
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
                {type === 'ANIME' ? (
                  <div>
                    <div className="text-slate-400 font-mono uppercase text-[10px]">
                      Episodes
                    </div>
                    <div className="text-slate-200 font-medium mt-0.5">
                      {media.episodes ?? 'Ongoing / Unknown'}
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-slate-400 font-mono uppercase text-[10px]">
                        Chapters
                      </div>
                      <div className="text-slate-200 font-medium mt-0.5">
                        {media.chapters ?? 'Ongoing'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-mono uppercase text-[10px]">
                        Volumes
                      </div>
                      <div className="text-slate-200 font-medium mt-0.5">
                        {media.volumes ?? '—'}
                      </div>
                    </div>
                  </>
                )}
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

              {media.producers && media.producers.length > 0 && (
                <div className="pt-2 border-t border-slate-800/70">
                  <div className="text-slate-400 font-mono uppercase text-[10px]">
                    {type === 'ANIME' ? 'Producers' : 'Authors & Staff'}
                  </div>
                  <div className="text-slate-300 mt-0.5 leading-relaxed">
                    {media.producers.slice(0, 5).join(', ')}
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
                  {showAltTitles ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {showAltTitles && (
                  <div className="mt-2 space-y-1 text-[11px]">
                    {media.title.romaji && (
                      <p className="text-slate-300">
                        <span className="text-slate-500">Romaji:</span>{' '}
                        {media.title.romaji}
                      </p>
                    )}
                    {media.title.english && (
                      <p className="text-slate-300">
                        <span className="text-slate-500">English:</span>{' '}
                        {media.title.english}
                      </p>
                    )}
                    {media.title.native && (
                      <p className="text-slate-300">
                        <span className="text-slate-500">Native:</span>{' '}
                        {media.title.native}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {tagsBlock}
            {linksBlock}
            {trailerBlock}
          </div>

          {/* Desktop 2-Column Hero (>= md) */}
          <div className="hidden md:grid md:grid-cols-[240px_1fr] gap-6">
            {/* Left Column: Cover + List Actions + Metadata */}
            <div className="space-y-4">
              <img
                src={coverSrc}
                alt={displayTitle}
                className="w-full rounded-2xl border border-slate-800 object-cover shadow-xl"
              />

              {existingEntry ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>{existingEntry.status}</span>
                    <span>
                      {existingEntry.progress} /{' '}
                      {(type === 'ANIME' ? media.episodes : media.chapters) ?? '?'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateEntry.mutate({
                          mediaId: existingEntry.media.id,
                          type,
                          progress: existingEntry.progress + 1,
                        })
                      }
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 hover:bg-sky-400 py-2 text-xs font-semibold text-slate-950 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />1
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="flex-1 rounded-lg border border-slate-700 hover:bg-slate-800 py-2 text-xs font-medium text-slate-200 cursor-pointer"
                    >
                      Edit Entry
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 py-2.5 text-sm font-semibold text-slate-950 transition-colors cursor-pointer"
                >
                  + Add to List
                </button>
              )}

              {/* Structured Info Box */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-3 text-xs">
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
                {type === 'ANIME' ? (
                  <div>
                    <div className="text-slate-400 font-mono uppercase text-[10px]">
                      Episodes
                    </div>
                    <div className="text-slate-200 font-medium mt-0.5">
                      {media.episodes ?? 'Ongoing / Unknown'}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-slate-400 font-mono uppercase text-[10px]">
                        Chapters
                      </div>
                      <div className="text-slate-200 font-medium mt-0.5">
                        {media.chapters ?? 'Ongoing'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-mono uppercase text-[10px]">
                        Volumes
                      </div>
                      <div className="text-slate-200 font-medium mt-0.5">
                        {media.volumes ?? '—'}
                      </div>
                    </div>
                  </div>
                )}
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
                {media.studios && media.studios.length > 0 && (
                  <div>
                    <div className="text-slate-400 font-mono uppercase text-[10px]">
                      Studios
                    </div>
                    <div className="text-slate-200 font-medium mt-0.5">
                      {media.studios.join(', ')}
                    </div>
                  </div>
                )}
                {media.producers && media.producers.length > 0 && (
                  <div>
                    <div className="text-slate-400 font-mono uppercase text-[10px]">
                      {type === 'ANIME' ? 'Producers' : 'Authors & Staff'}
                    </div>
                    <div className="text-slate-300 mt-0.5 leading-relaxed">
                      {media.producers.slice(0, 5).join(', ')}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-slate-400 font-mono uppercase text-[10px]">
                    Titles
                  </div>
                  <div className="mt-1 space-y-1 text-[11px]">
                    {media.title.romaji && (
                      <p className="text-slate-300">
                        <span className="text-slate-500">Romaji:</span>{' '}
                        {media.title.romaji}
                      </p>
                    )}
                    {media.title.english && (
                      <p className="text-slate-300">
                        <span className="text-slate-500">English:</span>{' '}
                        {media.title.english}
                      </p>
                    )}
                    {media.title.native && (
                      <p className="text-slate-300">
                        <span className="text-slate-500">Native:</span>{' '}
                        {media.title.native}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Title, Rankings, Airing, Synopsis, Tags, Links, Trailer */}
            <div className="space-y-6 min-w-0">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mb-2">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-sky-400">
                    {media.format ?? media.type}
                  </span>
                  {media.status && <span>{media.status.replace(/_/g, ' ')}</span>}
                  {media.averageScore && (
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <Star className="h-3.5 w-3.5 fill-amber-300" />
                      {media.averageScore}%
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-bold tracking-tight">
                  {displayTitle}
                </h1>
                {media.title.english && media.title.english !== displayTitle && (
                  <p className="text-sm text-slate-400 mt-1">
                    {media.title.english}
                  </p>
                )}
              </div>

              {airingBanner}
              {rankingsBlock}
              {genresBlock}
              {synopsisBlock}
              {tagsBlock}
              {linksBlock}
              {trailerBlock}
            </div>
          </div>

          {/* Relations (Sequels, Prequels, Adaptations) */}
          {media.relations && media.relations.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-400" />
                  Relations
                </h2>
                <button
                  type="button"
                  onClick={() => setDetailModal('relations')}
                  className="rounded-lg border border-slate-800 bg-slate-900/80 hover:border-sky-500/50 px-2.5 py-1 text-xs font-medium text-sky-400 transition-colors cursor-pointer"
                >
                  View all ({media.relations.length})
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:pb-0">
                {media.relations.map((rel) => (
                  <Link
                    key={`${rel.relationType}-${rel.id}`}
                    to={`/media/${rel.type.toLowerCase()}/${encodeURIComponent(
                      resolveTargetId(rel)
                    )}`}
                    className="min-w-[235px] shrink-0 snap-start md:min-w-0 flex gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:border-sky-500/50 p-2.5 transition-colors"
                  >
                    <img
                      src={
                        rel.coverUrl ||
                        'https://placehold.co/60x84/0f172a/64748b?text=?'
                      }
                      alt={formatMediaTitle(rel, titleLang)}
                      className="h-16 w-12 rounded-lg object-cover shrink-0 bg-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono uppercase text-sky-400">
                        {rel.relationType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs font-semibold text-slate-100 line-clamp-2 mt-0.5">
                        {formatMediaTitle(rel, titleLang)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {rel.format ?? rel.type}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Characters & Voice Actors */}
          {media.characters && media.characters.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-400" />
                  Characters {type === 'ANIME' ? '& Voice Actors' : ''}
                </h2>
                <button
                  type="button"
                  onClick={() => setDetailModal('characters')}
                  className="rounded-lg border border-slate-800 bg-slate-900/80 hover:border-indigo-500/50 px-2.5 py-1 text-xs font-medium text-indigo-400 transition-colors cursor-pointer"
                >
                  View all ({media.characters.length})
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:pb-0">
                {media.characters.map((ch) => (
                  <div
                    key={ch.id}
                    className="min-w-[265px] shrink-0 snap-start md:min-w-0 flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
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
            <section className="space-y-3">
              <h2 className="text-base font-semibold">Recommendations</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x md:grid md:grid-cols-4 lg:grid-cols-8 md:overflow-visible md:pb-0">
                {media.recommendations.map((rec) => (
                  <Link
                    key={rec.id}
                    to={`/media/${rec.type.toLowerCase()}/${encodeURIComponent(
                      resolveTargetId(rec)
                    )}`}
                    className="w-28 shrink-0 snap-start md:w-auto group rounded-xl border border-slate-800/80 bg-slate-900/50 hover:border-sky-500/50 overflow-hidden flex flex-col transition-colors"
                  >
                    <div className="relative aspect-[3/4] bg-slate-900">
                      <img
                        src={
                          rec.coverUrl ||
                          'https://placehold.co/180x260/0f172a/64748b?text=?'
                        }
                        alt={formatMediaTitle(rec, titleLang)}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {rec.averageScore && (
                        <span className="absolute top-1.5 right-1.5 rounded bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                          {rec.averageScore}%
                        </span>
                      )}
                    </div>
                    <div className="p-2 text-[11px] font-medium text-slate-200 line-clamp-2">
                      {formatMediaTitle(rec, titleLang)}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
        );
      })()}

      {editing && existingEntry && (
        <EditEntryModal
          entry={existingEntry}
          onClose={() => setEditing(false)}
          onSave={(update) => updateEntry.mutate(update)}
          onDelete={(mediaId) => deleteEntry.mutate({ mediaId, type })}
        />
      )}

      {detailModal && media && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="w-full sm:max-w-2xl max-h-[85vh] rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                {detailModal === 'relations' ? (
                  <>
                    <Sparkles className="h-4 w-4 text-sky-400" />
                    All Relations ({media.relations?.length ?? 0})
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 text-indigo-400" />
                    All Characters {type === 'ANIME' ? '& Voice Actors' : ''} (
                    {media.characters?.length ?? 0})
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                aria-label="Close modal"
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
                      className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 hover:border-sky-500/50 p-2.5 transition-colors"
                    >
                      <img
                        src={
                          rel.coverUrl ||
                          'https://placehold.co/60x84/0f172a/64748b?text=?'
                        }
                        alt={formatMediaTitle(rel, titleLang)}
                        className="h-16 w-12 rounded-lg object-cover shrink-0 bg-slate-800"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono uppercase text-sky-400">
                          {rel.relationType.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm font-semibold text-slate-100 line-clamp-2 mt-0.5">
                          {formatMediaTitle(rel, titleLang)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {rel.format ?? rel.type}
                        </div>
                      </div>
                    </Link>
                  ))
                : (media.characters ?? []).map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            ch.imageUrl ||
                            'https://placehold.co/48x64/0f172a/64748b?text=?'
                          }
                          alt={ch.name}
                          className="h-14 w-10 rounded-lg object-cover shrink-0 bg-slate-800"
                        />
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
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
                        <div className="flex items-center gap-2.5 text-right min-w-0">
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm text-slate-200 truncate">
                              {ch.voiceActor.name}
                            </div>
                            <div className="text-[10px] text-slate-500">JP</div>
                          </div>
                          {ch.voiceActor.imageUrl && (
                            <img
                              src={ch.voiceActor.imageUrl}
                              alt={ch.voiceActor.name}
                              className="h-14 w-10 rounded-lg object-cover shrink-0 bg-slate-800"
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
    </DesktopLayout>
  );
}
