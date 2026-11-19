import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, Tv } from 'lucide-react';
import { getTimeOfDayInfo, type TimeOfDayPhase } from '@mirusync/core';
import { SkyBackdrop } from './SkyBackdrop';

interface TimeGreetingCardProps {
  username?: string;
  animeCount?: number;
  mangaCount?: number;
}

const THEME_STYLES: Record<
  TimeOfDayPhase,
  {
    background: string;
    borderColor: string;
    textColor: string;
    subTextColor: string;
    accentColor: string;
    pillBg: string;
    pillBorder: string;
  }
> = {
  dawn: {
    background:
      'linear-gradient(135deg, #2b1e4a 0%, #70396f 42%, #dc727a 76%, #fbcfe8 100%)',
    borderColor: 'rgba(251, 207, 232, 0.38)',
    textColor: '#fff7ed',
    subTextColor: '#fde68a',
    accentColor: '#fef08a',
    pillBg: 'rgba(23, 15, 42, 0.38)',
    pillBorder: 'rgba(253, 230, 138, 0.35)',
  },
  day: {
    background:
      'linear-gradient(135deg, #bae6fd 0%, #e0f2fe 52%, #fef3c7 100%)',
    borderColor: 'rgba(56, 189, 248, 0.45)',
    textColor: '#0f172a',
    subTextColor: '#0369a1',
    accentColor: '#0284c7',
    pillBg: 'rgba(255, 255, 255, 0.72)',
    pillBorder: 'rgba(14, 165, 233, 0.32)',
  },
  dusk: {
    background:
      'linear-gradient(135deg, #1e1b4b 0%, #7c2d56 44%, #ea580c 78%, #fbbf24 100%)',
    borderColor: 'rgba(251, 146, 60, 0.42)',
    textColor: '#fffbeb',
    subTextColor: '#fed7aa',
    accentColor: '#fde047',
    pillBg: 'rgba(24, 14, 38, 0.42)',
    pillBorder: 'rgba(253, 186, 116, 0.35)',
  },
  night: {
    background:
      'linear-gradient(135deg, #090d1f 0%, #172554 56%, #312e81 100%)',
    borderColor: 'rgba(129, 140, 248, 0.35)',
    textColor: '#f1f5f9',
    subTextColor: '#7dd3fc',
    accentColor: '#38bdf8',
    pillBg: 'rgba(15, 23, 42, 0.55)',
    pillBorder: 'rgba(56, 189, 248, 0.32)',
  },
  midnight: {
    background:
      'linear-gradient(135deg, #030712 0%, #0f172a 52%, #1e1b4b 100%)',
    borderColor: 'rgba(99, 102, 241, 0.32)',
    textColor: '#f8fafc',
    subTextColor: '#a5b4fc',
    accentColor: '#818cf8',
    pillBg: 'rgba(9, 13, 28, 0.65)',
    pillBorder: 'rgba(129, 140, 248, 0.3)',
  },
};

export function TimeGreetingCard({
  username,
  animeCount,
  mangaCount,
}: TimeGreetingCardProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const info = getTimeOfDayInfo(now);
  const theme = THEME_STYLES[info.phase];

  return (
    <section
      className="relative overflow-hidden rounded-3xl border p-4 space-y-3 shadow-lg transition-colors duration-700"
      style={{
        background: theme.background,
        borderColor: theme.borderColor,
        color: theme.textColor,
      }}
    >
      <SkyBackdrop phase={info.phase} />

      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold"
            style={{ color: theme.subTextColor }}
          >
            <Sparkles className="h-3 w-3 animate-float-idle" />
            {info.greeting}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm"
            style={{
              backgroundColor: theme.pillBg,
              border: `1px solid ${theme.pillBorder}`,
              color: theme.textColor,
            }}
          >
            {info.label}
          </span>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: theme.textColor }}>
          Welcome back,{' '}
          <span style={{ color: theme.accentColor }}>{username ?? 'Tracker'}</span>
        </h1>

        <div className="flex items-center gap-2.5">
          <Link
            to="/anime"
            className="inline-flex items-center gap-2 rounded-xl backdrop-blur-md px-3.5 py-2 active:scale-95 transition-transform"
            style={{
              backgroundColor: theme.pillBg,
              border: `1px solid ${theme.pillBorder}`,
            }}
          >
            <Tv className="h-4 w-4 animate-float-idle" style={{ color: theme.accentColor }} />
            <span className="text-base font-bold font-mono" style={{ color: theme.accentColor }}>
              {animeCount ?? '—'}
            </span>
            <span className="text-xs font-medium" style={{ color: theme.textColor }}>
              Anime
            </span>
          </Link>
          <Link
            to="/manga"
            className="inline-flex items-center gap-2 rounded-xl backdrop-blur-md px-3.5 py-2 active:scale-95 transition-transform"
            style={{
              backgroundColor: theme.pillBg,
              border: `1px solid ${theme.pillBorder}`,
            }}
          >
            <BookOpen
              className="h-4 w-4 animate-float-idle"
              style={{ color: theme.accentColor, animationDelay: '-1.5s' }}
            />
            <span className="text-base font-bold font-mono" style={{ color: theme.accentColor }}>
              {mangaCount ?? '—'}
            </span>
            <span className="text-xs font-medium" style={{ color: theme.textColor }}>
              Manga
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
