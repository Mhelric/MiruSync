import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, Tv } from 'lucide-react';
import { getTimeOfDayInfo, type TimeOfDayPhase } from '@mirusync/core';

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

function SkyBackdrop({ phase }: { phase: TimeOfDayPhase }) {
  if (phase === 'day') {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-5 right-4 h-22 w-22 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full animate-sun-spin opacity-55"
            style={{
              background:
                'repeating-conic-gradient(from 0deg, rgba(251, 191, 36, 0.45) 0deg 12deg, transparent 12deg 30deg)',
              maskImage: 'radial-gradient(circle, black 35%, transparent 72%)',
              WebkitMaskImage: 'radial-gradient(circle, black 35%, transparent 72%)',
            }}
          />
          <div
            className="h-11 w-11 rounded-full animate-sun-pulse"
            style={{
              background: 'radial-gradient(circle, #fef08a 0%, #fbbf24 70%, #f59e0b 100%)',
              boxShadow: '0 0 24px rgba(251, 191, 36, 0.75)',
            }}
          />
        </div>
        <div
          className="absolute top-6 right-24 h-5 w-16 rounded-full animate-cloud-drift opacity-75"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            boxShadow: '10px -3px 0 2px rgba(255,255,255,0.85), -8px 2px 0 0px rgba(255,255,255,0.75)',
          }}
        />
        <div
          className="absolute bottom-3 right-8 h-4 w-14 rounded-full animate-cloud-drift opacity-60"
          style={{
            animationDelay: '-4s',
            background: 'rgba(255, 255, 255, 0.8)',
            boxShadow: '8px -2px 0 1px rgba(255,255,255,0.8)',
          }}
        />
      </div>
    );
  }

  if (phase === 'dawn') {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -bottom-8 right-6 h-22 w-22 rounded-full animate-sun-pulse"
          style={{
            background: 'radial-gradient(circle, #fef08a 0%, #fda4af 65%, transparent 100%)',
            boxShadow: '0 0 36px rgba(253, 186, 116, 0.7)',
          }}
        />
        <div
          className="absolute top-5 right-14 h-5 w-24 rounded-full blur-md animate-cloud-drift opacity-40"
          style={{ background: '#fbcfe8' }}
        />
        <span className="absolute top-7 right-32 h-1.5 w-1.5 rounded-full bg-amber-200 animate-mote-float" />
        <span
          className="absolute bottom-8 right-24 h-2 w-2 rounded-full bg-pink-200 animate-mote-float"
          style={{ animationDelay: '-2.4s' }}
        />
      </div>
    );
  }

  if (phase === 'dusk') {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -bottom-7 right-6 h-22 w-22 rounded-full animate-sun-pulse"
          style={{
            background: 'radial-gradient(circle, #fde047 0%, #fb7185 68%, transparent 100%)',
            boxShadow: '0 0 40px rgba(251, 146, 60, 0.75)',
          }}
        />
        <div
          className="absolute top-6 right-16 h-4 w-24 rounded-full blur-sm animate-cloud-drift opacity-40"
          style={{ background: 'linear-gradient(90deg, transparent, #fed7aa, transparent)' }}
        />
        <svg
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
          className="absolute bottom-0 inset-x-0 h-5 w-full opacity-25"
        >
          <path d="M0,40 L0,26 Q90,10 180,24 T360,18 L400,24 L400,40 Z" fill="#090616" />
        </svg>
      </div>
    );
  }

  if (phase === 'night') {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-4 right-6 h-10 w-10 animate-moon-float">
          <div
            className="h-10 w-10 rounded-full"
            style={{
              background: 'transparent',
              boxShadow: '-6px 3px 0 2px #fef9c3',
              filter: 'drop-shadow(0 0 10px rgba(254, 249, 195, 0.55))',
            }}
          />
        </div>
        <span className="absolute top-4 right-22 h-1.5 w-1.5 rounded-full bg-sky-200 animate-star-twinkle" />
        <span
          className="absolute top-12 right-30 h-1 w-1 rounded-full bg-white animate-star-twinkle"
          style={{ animationDelay: '-1.1s' }}
        />
        <span
          className="absolute bottom-8 right-18 h-1.5 w-1.5 rounded-full bg-indigo-200 animate-star-twinkle"
          style={{ animationDelay: '-2.2s' }}
        />
        <div
          className="absolute top-5 right-14 h-[2px] w-12 rounded-full animate-shooting-star"
          style={{
            background: 'linear-gradient(90deg, #ffffff, rgba(125, 211, 252, 0))',
          }}
        />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -top-10 -right-8 h-32 w-44 rounded-full blur-2xl animate-aurora opacity-45"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)' }}
      />
      <div
        className="absolute top-4 right-6 h-8 w-8 rounded-full animate-moon-float"
        style={{
          background: 'radial-gradient(circle at 35% 35%, #f8fafc 0%, #cbd5e1 100%)',
          boxShadow: '0 0 18px rgba(165, 180, 252, 0.5)',
        }}
      />
      <span className="absolute top-5 right-22 h-1 w-1 rounded-full bg-indigo-200 animate-star-twinkle" />
      <span
        className="absolute top-14 right-28 h-1.5 w-1.5 rounded-full bg-cyan-300 animate-mote-float"
        style={{ animationDelay: '-1.8s' }}
      />
      <span
        className="absolute bottom-6 right-14 h-1.5 w-1.5 rounded-full bg-indigo-300 animate-mote-float"
        style={{ animationDelay: '-3.1s' }}
      />
    </div>
  );
}

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
