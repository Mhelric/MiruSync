import { useState } from 'react';
import { Block, Button, Card, Segmented, SegmentedButton } from 'konsta/react';
import {
  formatCountdown,
  formatMediaTitle,
  useAiringSchedule,
  useAnimeNews,
  useMediaSearch,
  usePopularMedia,
  useUpdateEntry,
} from '@mirusync/core';
import { MobileLayout } from '../layouts/MobileLayout';
import { API_BASE } from '../lib/mobileAuth';

type DiscoverTab = 'popular' | 'calendar' | 'search' | 'news';

export function MobileDiscoverPage() {
  const [tab, setTab] = useState<DiscoverTab>('popular');
  const [query, setQuery] = useState('');

  const { data: popular } = usePopularMedia('ANIME', 'trending', 1, API_BASE);
  const { data: schedule } = useAiringSchedule(API_BASE);
  const { data: news } = useAnimeNews(API_BASE);
  const { data: searchRes } = useMediaSearch(
    query,
    { type: 'ANIME', includeAdult: false, perPage: 15 },
    API_BASE
  );
  const updateEntry = useUpdateEntry(API_BASE);

  return (
    <MobileLayout title="Discover">
      <Block className="my-3">
        <Segmented strong rounded>
          <SegmentedButton active={tab === 'popular'} onClick={() => setTab('popular')}>
            Popular
          </SegmentedButton>
          <SegmentedButton active={tab === 'calendar'} onClick={() => setTab('calendar')}>
            Calendar
          </SegmentedButton>
          <SegmentedButton active={tab === 'search'} onClick={() => setTab('search')}>
            Search
          </SegmentedButton>
          <SegmentedButton active={tab === 'news'} onClick={() => setTab('news')}>
            News
          </SegmentedButton>
        </Segmented>
      </Block>

      <div className="px-4 space-y-2.5">
        {tab === 'popular' &&
          (popular?.items ?? [])
            .filter((m) => !m.isAdult)
            .slice(0, 15)
            .map((media) => (
              <Card key={media.id} className="m-0 bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-3">
                  <img
                    src={media.coverUrl || 'https://placehold.co/60x84/0f172a/64748b?text=?'}
                    alt={formatMediaTitle(media)}
                    className="h-14 w-10 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {formatMediaTitle(media)}
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      {media.format} {media.averageScore ? `· ${media.averageScore}%` : ''}
                    </div>
                  </div>
                  <Button
                    small
                    rounded
                    onClick={() =>
                      updateEntry.mutate({
                        mediaId: media.id,
                        type: media.type,
                        status: 'PLANNING',
                        progress: 0,
                      })
                    }
                    className="w-auto px-3 bg-sky-500/20 text-sky-300"
                  >
                    + Add
                  </Button>
                </div>
              </Card>
            ))}

        {tab === 'calendar' &&
          (schedule?.items ?? []).slice(0, 20).map((item) => (
            <Card key={item.id} className="m-0 bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {formatMediaTitle(item.media)}
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Ep {item.episode} ·{' '}
                    {new Date(item.airingAt * 1000).toLocaleString([], {
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 shrink-0">
                  {formatCountdown(item.airingAt)}
                </span>
              </div>
            </Card>
          ))}

        {tab === 'search' && (
          <div className="space-y-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anime…"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100"
            />
            {(searchRes?.items ?? [])
              .filter((m) => !m.isAdult)
              .map((media) => (
                <Card key={media.id} className="m-0 bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {formatMediaTitle(media)}
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        {media.format} {media.seasonYear ?? ''}
                      </div>
                    </div>
                    <Button
                      small
                      rounded
                      onClick={() =>
                        updateEntry.mutate({
                          mediaId: media.id,
                          type: media.type,
                          status: 'PLANNING',
                          progress: 0,
                        })
                      }
                      className="w-auto px-3 bg-sky-500/20 text-sky-300"
                    >
                      + Add
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        )}

        {tab === 'news' &&
          (news?.items ?? []).slice(0, 15).map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <Card className="m-0 bg-slate-900/60 border border-slate-800">
                <div className="text-[11px] font-mono text-sky-400 mb-1">
                  {item.source}
                </div>
                <div className="text-sm font-medium text-slate-100">{item.title}</div>
              </Card>
            </a>
          ))}
      </div>
    </MobileLayout>
  );
}
