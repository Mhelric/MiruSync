import { Block, BlockTitle, Button, Card } from 'konsta/react';
import { Plus } from 'lucide-react';
import {
  formatMediaTitle,
  useAuthStore,
  useMediaList,
  useUpdateEntry,
} from '@mirusync/core';
import { MobileLayout } from '../layouts/MobileLayout';
import { API_BASE } from '../lib/mobileAuth';

export function MobileHomePage() {
  const session = useAuthStore((s) => s.session);
  const { data: animeList } = useMediaList('ANIME', undefined, API_BASE);
  const { data: mangaList } = useMediaList('MANGA', undefined, API_BASE);
  const updateEntry = useUpdateEntry(API_BASE);

  const watching = (animeList ?? [])
    .filter((e) => e.status === 'CURRENT' && !e.media.isAdult)
    .slice(0, 5);

  return (
    <MobileLayout title="MiruSync">
      <Block className="mt-4 mb-2">
        <p className="text-xs text-slate-400">Welcome back,</p>
        <h2 className="text-xl font-bold">{session?.user.name}</h2>
      </Block>

      <div className="grid grid-cols-2 gap-3 px-4 mb-4">
        <Card className="m-0 bg-slate-900/70 border border-slate-800">
          <div className="text-2xl font-bold font-mono text-sky-400">
            {animeList?.length ?? '—'}
          </div>
          <div className="text-xs text-slate-400">Anime</div>
        </Card>
        <Card className="m-0 bg-slate-900/70 border border-slate-800">
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {mangaList?.length ?? '—'}
          </div>
          <div className="text-xs text-slate-400">Manga</div>
        </Card>
      </div>

      <BlockTitle>Continue Watching</BlockTitle>
      <div className="space-y-2.5 px-4">
        {watching.length === 0 ? (
          <p className="text-xs text-slate-500">No anime currently watching.</p>
        ) : (
          watching.map((entry) => (
            <Card
              key={entry.media.id}
              className="m-0 bg-slate-900/60 border border-slate-800"
            >
              <div className="flex items-center gap-3">
                <img
                  src={entry.media.coverUrl || 'https://placehold.co/60x84/0f172a/64748b?text=?'}
                  alt={formatMediaTitle(entry.media)}
                  className="h-14 w-10 rounded-lg object-cover shrink-0 bg-slate-800"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-100 truncate">
                    {formatMediaTitle(entry.media)}
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    Ep {entry.progress} / {entry.media.episodes ?? '?'}
                  </div>
                </div>
                <Button
                  small
                  rounded
                  onClick={() =>
                    updateEntry.mutate({
                      mediaId: entry.media.id,
                      type: 'ANIME',
                      progress: entry.progress + 1,
                    })
                  }
                  className="w-auto px-3 bg-sky-500/20 text-sky-300"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />1
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </MobileLayout>
  );
}
