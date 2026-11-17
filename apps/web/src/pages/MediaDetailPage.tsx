import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Plus, Star } from 'lucide-react';
import {
  formatMediaTitle,
  useDeleteEntry,
  useMediaDetail,
  useMediaList,
  useUpdateEntry,
  type ListEntry,
  type MediaType,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';
import { EditEntryModal } from '../components/EditEntryModal';

export function MediaDetailPage() {
  const { type: rawType, id: rawId } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const type: MediaType = rawType?.toUpperCase() === 'MANGA' ? 'MANGA' : 'ANIME';
  const id = rawId ? decodeURIComponent(rawId) : undefined;

  const { data: media, isLoading, isError } = useMediaDetail(id, type);
  const { data: list } = useMediaList(type);
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();
  const [editing, setEditing] = useState(false);

  const existingEntry: ListEntry | undefined = list?.find(
    (e) => e.media.id === id
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
        <div className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
      ) : isError || !media ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
          Failed to load media details.
        </div>
      ) : (
        <div className="space-y-6">
          {media.bannerUrl && (
            <div className="h-48 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
              <img
                src={media.bannerUrl}
                alt={formatMediaTitle(media)}
                className="h-full w-full object-cover opacity-75"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
            {/* Left column */}
            <div className="space-y-4">
              <img
                src={media.coverUrl || 'https://placehold.co/300x420/0f172a/64748b?text=No+Cover'}
                alt={formatMediaTitle(media)}
                className="w-full rounded-2xl border border-slate-800 object-cover shadow-lg"
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
                          mediaId: media.id,
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
            </div>

            {/* Right column */}
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mb-2">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-sky-400">
                    {media.format ?? media.type}
                  </span>
                  {media.status && <span>{media.status}</span>}
                  {media.season && media.seasonYear && (
                    <span>
                      {media.season} {media.seasonYear}
                    </span>
                  )}
                  {media.averageScore && (
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <Star className="h-3.5 w-3.5 fill-amber-300" />
                      {media.averageScore}%
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-bold tracking-tight">
                  {formatMediaTitle(media, 'romaji')}
                </h1>
                {media.title.english &&
                  media.title.english !== media.title.romaji && (
                    <p className="text-sm text-slate-400 mt-1">
                      {media.title.english}
                    </p>
                  )}
              </div>

              {media.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {media.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-0.5 text-xs text-slate-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {media.synopsis && (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {media.synopsis.replace(/<[^>]+>/g, '')}
                </p>
              )}

              {media.streamingLinks && media.streamingLinks.length > 0 && (
                <div className="pt-2">
                  <h2 className="text-xs font-mono uppercase text-slate-400 mb-2">
                    Where to Watch
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {media.streamingLinks.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 px-3 py-1.5 text-xs text-slate-200"
                      >
                        {link.site}
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editing && existingEntry && (
        <EditEntryModal
          entry={existingEntry}
          onClose={() => setEditing(false)}
          onSave={(update) => updateEntry.mutate(update)}
          onDelete={(mediaId) => deleteEntry.mutate({ mediaId, type })}
        />
      )}
    </DesktopLayout>
  );
}
