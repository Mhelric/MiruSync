import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Download } from 'lucide-react';
import {
  buildIcsCalendar,
  formatCountdown,
  formatMediaTitle,
  useAiringSchedule,
  useAuthStore,
  useMediaList,
  type AiringScheduleItem,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMondayBasedDayIndex(date: Date): number {
  const day = date.getDay(); // 0=Sun, 1=Mon...
  return day === 0 ? 6 : day - 1;
}

export function CalendarPage() {
  const session = useAuthStore((s) => s.session);
  const { data: scheduleData, isLoading, isError, refetch } = useAiringSchedule();
  const { data: animeList } = useMediaList('ANIME');
  const [myListOnly, setMyListOnly] = useState(false);

  const userIds = useMemo(() => {
    const alIds = new Set<number>();
    const malIds = new Set<number>();
    for (const entry of animeList ?? []) {
      if (entry.status !== 'CURRENT' && entry.status !== 'PLANNING') continue;
      if (entry.media.alId) alIds.add(entry.media.alId);
      if (entry.media.malId) malIds.add(entry.media.malId);
    }
    return { alIds, malIds };
  }, [animeList]);

  const filteredItems = useMemo(() => {
    const items = scheduleData?.items ?? [];
    if (!myListOnly) return items;
    return items.filter(
      (item) =>
        userIds.alIds.has(item.media.alId) ||
        (item.media.malId !== undefined && userIds.malIds.has(item.media.malId))
    );
  }, [scheduleData, myListOnly, userIds]);

  const byDay = useMemo(() => {
    const columns: AiringScheduleItem[][] = Array.from({ length: 7 }, () => []);
    for (const item of filteredItems) {
      const idx = getMondayBasedDayIndex(new Date(item.airingAt * 1000));
      columns[idx].push(item);
    }
    return columns;
  }, [filteredItems]);

  function handleExportIcs() {
    const ics = buildIcsCalendar(filteredItems);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mirusync-schedule.ics';
    a.click();
    URL.revokeObjectURL(url);
  }

  const todayIdx = getMondayBasedDayIndex(new Date());

  return (
    <DesktopLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-sky-400" />
              Release Calendar
            </h1>
            <p className="text-sm text-slate-400">
              Weekly airing schedule in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
              <button
                type="button"
                onClick={() => setMyListOnly(false)}
                className={`rounded-md px-3 py-1.5 font-medium cursor-pointer ${
                  !myListOnly ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
                }`}
              >
                All Airing
              </button>
              <button
                type="button"
                onClick={() => setMyListOnly(true)}
                className={`rounded-md px-3 py-1.5 font-medium cursor-pointer ${
                  myListOnly ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
                }`}
              >
                My List Only
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportIcs}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export .ics
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="h-72 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <p className="text-sm text-rose-300">Failed to load airing schedule.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded-lg bg-rose-500/20 px-4 py-1.5 text-xs text-rose-200 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {WEEKDAYS.map((day, idx) => (
              <div
                key={day}
                className={`rounded-xl border p-3 flex flex-col gap-2.5 ${
                  idx === todayIdx
                    ? 'border-sky-500/40 bg-sky-500/5'
                    : 'border-slate-800/80 bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      idx === todayIdx ? 'text-sky-400' : 'text-slate-400'
                    }`}
                  >
                    {day}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {byDay[idx].length}
                  </span>
                </div>

                <div className="space-y-2">
                  {byDay[idx].length === 0 ? (
                    <p className="text-[11px] text-slate-500 py-4 text-center">
                      No episodes
                    </p>
                  ) : (
                    byDay[idx].map((item) => {
                      const timeStr = new Date(item.airingAt * 1000).toLocaleTimeString(
                        [],
                        { hour: '2-digit', minute: '2-digit' }
                      );
                      const targetId =
                        session?.provider === 'mal' && item.media.malId
                          ? `mal:${item.media.malId}`
                          : item.media.id;

                      return (
                        <Link
                          key={item.id}
                          to={`/media/anime/${encodeURIComponent(targetId)}`}
                          className="block rounded-lg border border-slate-800 bg-slate-950/70 hover:border-slate-700 p-2 transition-colors"
                        >
                          <div className="flex gap-2">
                            <img
                              src={
                                item.media.coverUrl ||
                                'https://placehold.co/40x56/0f172a/64748b?text=?'
                              }
                              alt={formatMediaTitle(item.media)}
                              className="h-12 w-9 rounded object-cover shrink-0 bg-slate-800"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-100 line-clamp-2 leading-snug">
                                {formatMediaTitle(item.media)}
                              </p>
                              <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
                                <span>Ep {item.episode}</span>
                                <span className="text-sky-400">{timeStr}</span>
                              </div>
                              <div className="mt-0.5 text-[10px] font-mono text-emerald-400">
                                {formatCountdown(item.airingAt)}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DesktopLayout>
  );
}
