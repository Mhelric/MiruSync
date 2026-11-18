import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, Download, Search, Star } from 'lucide-react';
import {
  buildIcsCalendar,
  formatCountdown,
  formatMediaTitle,
  useAiringSchedule,
  useAuthStore,
  useMediaList,
  useSettingsStore,
  type AiringScheduleItem,
} from '@mirusync/core';
import { DesktopLayout } from '../layouts/DesktopLayout';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMondayBasedDayIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function getCurrentWeekDates(): Date[] {
  const now = new Date();
  const mondayOffset = getMondayBasedDayIndex(now);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - mondayOffset + i);
    return d;
  });
}

export function CalendarPage() {
  const session = useAuthStore((s) => s.session);
  const titleLang = useSettingsStore((s) => s.settings.title_language);
  const { data: scheduleData, isLoading, isError, refetch } = useAiringSchedule();
  const { data: animeList } = useMediaList('ANIME');

  const todayIdx = getMondayBasedDayIndex(new Date());
  const weekDates = useMemo(() => getCurrentWeekDates(), []);

  const [selectedDay, setSelectedDay] = useState<number>(todayIdx);
  const [myListOnly, setMyListOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    let items = scheduleData?.items ?? [];
    if (myListOnly) {
      items = items.filter(
        (item) =>
          userIds.alIds.has(item.media.alId) ||
          (item.media.malId !== undefined && userIds.malIds.has(item.media.malId))
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      items = items.filter((item) =>
        `${item.media.title.romaji ?? ''} ${item.media.title.english ?? ''}`
          .toLowerCase()
          .includes(q)
      );
    }
    return items;
  }, [scheduleData, myListOnly, searchQuery, userIds]);

  const byDay = useMemo(() => {
    const columns: AiringScheduleItem[][] = Array.from({ length: 7 }, () => []);
    for (const item of filteredItems) {
      const idx = getMondayBasedDayIndex(new Date(item.airingAt * 1000));
      columns[idx].push(item);
    }
    for (const col of columns) {
      col.sort((a, b) => a.airingAt - b.airingAt);
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

  const dayItems = byDay[selectedDay] ?? [];
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const nowSec = Math.floor(clock.getTime() / 1000);

  return (
    <DesktopLayout>
      <div className="space-y-6">
        {/* Top Bar with Live Clock & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <CalendarIcon className="h-5 w-5 text-sky-400" />
              Airing Schedule
            </h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Clock className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-slate-200 font-semibold">
                {clock.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <span>· {tzName}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter schedule…"
                className="rounded-lg border border-slate-800 bg-slate-900/70 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 w-44"
              />
            </div>

            <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
              <button
                type="button"
                onClick={() => setMyListOnly(false)}
                className={`rounded-md px-3 py-1 font-medium transition-colors cursor-pointer ${
                  !myListOnly ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
                }`}
              >
                All Airing
              </button>
              <button
                type="button"
                onClick={() => setMyListOnly(true)}
                className={`rounded-md px-3 py-1 font-medium transition-colors cursor-pointer ${
                  myListOnly ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
                }`}
              >
                My List
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportIcs}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              .ics
            </button>
          </div>
        </div>

        {/* Horizontal Day Selector Strip (Miruro-inspired) */}
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((day, idx) => {
            const active = idx === selectedDay;
            const isToday = idx === todayIdx;
            const dateNum = weekDates[idx].getDate();
            const count = byDay[idx].length;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(idx)}
                className={`relative rounded-2xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                  active
                    ? 'border-sky-400/60 bg-sky-500/15 shadow-lg shadow-sky-500/10 scale-[1.01]'
                    : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      active ? 'text-sky-400' : 'text-slate-400'
                    }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                      Today
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-lg font-bold font-mono text-slate-100">
                    {dateNum}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {count} {count === 1 ? 'ep' : 'eps'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Time-Ordered Episode Feed */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
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
        ) : dayItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-sm text-slate-400">
            No episodes scheduled for {WEEKDAYS[selectedDay]}.
          </div>
        ) : (
          <div className="space-y-3">
            {dayItems.map((item) => {
              const aired = item.airingAt <= nowSec;
              const timeStr = new Date(item.airingAt * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const targetId =
                session?.provider === 'mal' && item.media.malId
                  ? `mal:${item.media.malId}`
                  : item.media.id;

              return (
                <Link
                  key={item.id}
                  to={`/media/anime/${encodeURIComponent(targetId)}`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:border-sky-500/50 p-4 flex items-center gap-4 transition-all duration-200"
                >
                  {item.media.bannerUrl && (
                    <img
                      src={item.media.bannerUrl}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
                    />
                  )}

                  {/* Airing Time Column */}
                  <div className="relative z-10 w-20 shrink-0 text-center border-r border-slate-800/80 pr-4">
                    <div className="text-base font-bold font-mono text-sky-400">
                      {timeStr}
                    </div>
                    <div
                      className={`mt-1 text-[10px] font-mono ${
                        aired ? 'text-emerald-400' : 'text-amber-300'
                      }`}
                    >
                      {aired ? 'Aired' : `in ${formatCountdown(item.airingAt)}`}
                    </div>
                  </div>

                  {/* Cover */}
                  <img
                    src={
                      item.media.coverUrl ||
                      'https://placehold.co/64x90/0f172a/64748b?text=?'
                    }
                    alt={formatMediaTitle(item.media, titleLang)}
                    className="relative z-10 h-16 w-12 rounded-lg object-cover shrink-0 bg-slate-800 border border-slate-700/60"
                  />

                  {/* Title & Genres */}
                  <div className="relative z-10 flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-semibold text-slate-100 group-hover:text-sky-400 truncate transition-colors">
                      {formatMediaTitle(item.media, titleLang)}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {item.media.format && (
                        <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                          {item.media.format}
                        </span>
                      )}
                      {item.media.averageScore && (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                          <Star className="h-2.5 w-2.5 fill-amber-300" />
                          {item.media.averageScore}%
                        </span>
                      )}
                      {(item.media.genres ?? []).slice(0, 3).map((g) => (
                        <span
                          key={g}
                          className="rounded-full border border-slate-700/70 bg-slate-950/60 px-2 py-0.5 text-[10px] text-slate-300"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Episode Pill */}
                  <div className="relative z-10 shrink-0">
                    <span
                      className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-mono font-semibold border ${
                        aired
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                      }`}
                    >
                      Episode {item.episode}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DesktopLayout>
  );
}
