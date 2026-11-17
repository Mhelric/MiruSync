import { useMemo, useState } from 'react';
import { Block, Button, Card, Segmented, SegmentedButton } from 'konsta/react';
import { Plus } from 'lucide-react';
import {
  formatMediaTitle,
  useMediaList,
  useUpdateEntry,
  type ListEntry,
  type ListStatus,
  type MediaType,
} from '@mirusync/core';
import { MobileLayout } from '../layouts/MobileLayout';
import { API_BASE } from '../lib/mobileAuth';

const TABS: { key: ListStatus; label: string }[] = [
  { key: 'CURRENT', label: 'Current' },
  { key: 'PLANNING', label: 'Plan' },
  { key: 'COMPLETED', label: 'Done' },
  { key: 'PAUSED', label: 'Hold' },
];

export function MobileTrackerPage({ type }: { type: MediaType }) {
  const [status, setStatus] = useState<ListStatus>('CURRENT');
  const { data: entries, isLoading } = useMediaList(type, undefined, API_BASE);
  const updateEntry = useUpdateEntry(API_BASE);

  const filtered = useMemo(
    () =>
      (entries ?? []).filter(
        (e) => !e.media.isAdult && e.status === status
      ),
    [entries, status]
  );

  function handleIncrement(entry: ListEntry) {
    const max = type === 'ANIME' ? entry.media.episodes : entry.media.chapters;
    const nextProgress = entry.progress + 1;
    updateEntry.mutate({
      mediaId: entry.media.id,
      type,
      progress: nextProgress,
      status: max && nextProgress >= max ? 'COMPLETED' : entry.status,
    });
  }

  return (
    <MobileLayout title={type === 'ANIME' ? 'Anime Tracker' : 'Manga Tracker'}>
      <Block className="my-3">
        <Segmented strong rounded>
          {TABS.map((t) => (
            <SegmentedButton
              key={t.key}
              active={status === t.key}
              onClick={() => setStatus(t.key)}
            >
              {t.label}
            </SegmentedButton>
          ))}
        </Segmented>
      </Block>

      <div className="space-y-2.5 px-4">
        {isLoading ? (
          <p className="text-xs text-slate-400 text-center py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            No titles in this status.
          </p>
        ) : (
          filtered.map((entry) => {
            const total = type === 'ANIME' ? entry.media.episodes : entry.media.chapters;
            const unit = type === 'ANIME' ? 'Ep' : 'Ch';
            const canInc = !total || entry.progress < total;

            return (
              <Card
                key={entry.media.id}
                className="m-0 bg-slate-900/60 border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      entry.media.coverUrl ||
                      'https://placehold.co/60x84/0f172a/64748b?text=?'
                    }
                    alt={formatMediaTitle(entry.media)}
                    className="h-16 w-11 rounded-lg object-cover shrink-0 bg-slate-800"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-100 line-clamp-1">
                      {formatMediaTitle(entry.media)}
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-1">
                      {unit} {entry.progress} / {total ?? '?'}
                    </div>
                  </div>
                  {canInc && (
                    <Button
                      small
                      rounded
                      onClick={() => handleIncrement(entry)}
                      className="w-auto px-3 bg-sky-500/20 text-sky-300"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />1
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </MobileLayout>
  );
}
