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

const flat = { transformBox: 'fill-box', transformOrigin: 'center' } as const;

function Dot({
  cx,
  cy,
  r = 1.6,
  fill = '#ffffff',
  delay = 0,
}: {
  cx: number;
  cy: number;
  r?: number;
  fill?: string;
  delay?: number;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      className="animate-star-twinkle"
      style={{ ...flat, animationDelay: `-${delay}s` }}
    />
  );
}

function Cloud({
  x,
  y,
  w = 46,
  fill,
  opacity = 0.85,
  delay = 0,
}: {
  x: number;
  y: number;
  w?: number;
  fill: string;
  opacity?: number;
  delay?: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={8}
      rx={4}
      fill={fill}
      opacity={opacity}
      className="animate-cloud-drift"
      style={{ animationDelay: `-${delay}s` }}
    />
  );
}

function SkyBackdrop({ phase }: { phase: TimeOfDayPhase }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 120"
      preserveAspectRatio="xMaxYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {phase === 'day' && (
        <>
          <circle cx={348} cy={34} r={22} fill="none" stroke="#f59e0b" strokeWidth={1.5} opacity={0.5} className="animate-sun-pulse" style={flat} />
          <circle cx={348} cy={34} r={14} fill="#f59e0b" />
          <Cloud x={262} y={24} fill="#ffffff" />
          <Cloud x={300} y={84} w={36} fill="#ffffff" opacity={0.7} delay={4} />
        </>
      )}

      {phase === 'dawn' && (
        <>
          <path d="M296 120 A32 32 0 0 1 360 120 Z" fill="#fde68a" className="animate-sun-pulse" style={flat} />
          <Cloud x={268} y={30} fill="#fbcfe8" opacity={0.6} />
          <Cloud x={326} y={52} w={34} fill="#fbcfe8" opacity={0.5} delay={4} />
          <Dot cx={250} cy={24} fill="#fef3c7" delay={1} />
          <Dot cx={380} cy={26} fill="#fef3c7" delay={2.4} />
        </>
      )}

      {phase === 'dusk' && (
        <>
          <path d="M300 120 A30 30 0 0 1 360 120 Z" fill="#fbbf24" className="animate-sun-pulse" style={flat} />
          <Cloud x={262} y={30} fill="#fed7aa" opacity={0.5} />
          <Cloud x={330} y={54} w={32} fill="#fed7aa" opacity={0.4} delay={4} />
          <path d="M0 120 V104 Q100 90 200 102 T400 98 V120 Z" fill="#000000" opacity={0.18} />
        </>
      )}

      {phase === 'night' && (
        <>
          <path
            d="M350 16 a20 20 0 1 0 14 34 a16 16 0 1 1 -14 -34 Z"
            fill="#fef9c3"
            className="animate-moon-float"
          />
          <Dot cx={290} cy={24} delay={0} />
          <Dot cx={318} cy={64} r={1.2} fill="#bae6fd" delay={1.1} />
          <Dot cx={268} cy={78} r={1.2} delay={2.2} />
          <Dot cx={384} cy={80} r={1.4} fill="#bae6fd" delay={0.6} />
        </>
      )}

      {phase === 'midnight' && (
        <>
          <circle cx={352} cy={34} r={14} fill="#e2e8f0" className="animate-moon-float" />
          <circle cx={352} cy={34} r={22} fill="none" stroke="#a5b4fc" strokeWidth={1} opacity={0.4} className="animate-sun-pulse" style={flat} />
          <Dot cx={286} cy={22} fill="#c7d2fe" delay={0} />
          <Dot cx={312} cy={70} r={1.2} fill="#a5f3fc" delay={1.8} />
          <Dot cx={270} cy={88} r={1.2} fill="#c7d2fe" delay={3.1} />
          <Dot cx={382} cy={84} r={1.4} fill="#c7d2fe" delay={0.9} />
        </>
      )}
    </svg>
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
              {animeCount ?? 'â€”'}
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
              {mangaCount ?? 'â€”'}
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
