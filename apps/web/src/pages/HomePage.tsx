import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Tv } from 'lucide-react';
import {
  useAuthStore,
  useDeleteEntry,
  useMediaList,
  useUpdateEntry,
  type ListEntry,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';
import { MediaCard } from '../components/MediaCard';
import { EditEntryModal } from '../components/EditEntryModal';

export function HomePage() {
  const session = useAuthStore((s) => s.session);
  const { data: animeList, isLoading: animeLoading } = useMediaList('ANIME');
  const { data: mangaList, isLoading: mangaLoading } = useMediaList('MANGA');
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();
  const [editing, setEditing] = useState<ListEntry | null>(null);

  const watching = (animeList ?? [])
    .filter((e) => e.status === 'CURRENT' && !e.media.isAdult)
    .slice(0, 5);
  const reading = (mangaList ?? [])
    .filter((e) => e.status === 'CURRENT' && !e.media.isAdult)
    .slice(0, 5);

  return (
    <DesktopLayout>
      <div className="space-y-8">
        {/* Greeting + Quick Stats */}
        <section className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-900/40 p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {session?.user.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Pick up right where you left off.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-center">
              <div className="text-xl font-bold font-mono text-sky-400">
                {animeList?.length ?? '—'}
              </div>
              <div className="text-[11px] text-slate-400">Anime Entries</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-center">
              <div className="text-xl font-bold font-mono text-indigo-400">
                {mangaList?.length ?? '—'}
              </div>
              <div className="text-[11px] text-slate-400">Manga Entries</div>
            </div>
          </div>
        </section>

        {/* Continue Watching */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Tv className="h-4 w-4 text-sky-400" />
              Continue Watching
            </h2>
            <Link to="/anime" className="text-xs text-sky-400 hover:underline">
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
              <BookOpen className="h-4 w-4 text-indigo-400" />
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
