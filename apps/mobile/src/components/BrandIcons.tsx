import { useId } from 'react';
import { Globe } from 'lucide-react';

export function MiruSyncLogo({ className = 'h-8 w-8' }: { className?: string }) {
  const id = useId();
  const borderGrad = `${id}-border`;
  const ambientGlow = `${id}-ambient`;
  const topGrad = `${id}-top`;
  const midGrad = `${id}-mid`;
  const botGrad = `${id}-bot`;
  const barGlow = `${id}-glow`;

  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={borderGrad} x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <radialGradient id={ambientGlow} cx="50%" cy="56%" r="46%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#090d1a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={topGrad} x1="18" y1="15" x2="46" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id={midGrad} x1="18" y1="27" x2="43" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id={botGrad} x1="16" y1="40" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c026d3" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
        <filter id={barGlow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="64" height="64" rx="16" fill="#090d1a" className="ms-logo-bg transition-colors" />
      <rect width="64" height="64" rx="16" fill={`url(#${ambientGlow})`} />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="14.5"
        stroke={`url(#${borderGrad})`}
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      <g transform="rotate(10 32 32)">
        <path
          d="M18.5 17.4 Q18.5 15 20.9 15 Q32 13.2 43.1 15 Q45.5 15 45.5 17.4 L45.5 20.1 Q45.5 22.5 43.1 22.5 Q32 20.7 20.9 22.5 Q18.5 22.5 18.5 20.1 Z"
          fill={`url(#${topGrad})`}
          stroke="#e9d5ff"
          strokeOpacity="0.22"
          strokeWidth="0.6"
        />
        <path
          d="M18.5 29.9 Q18.5 27.5 20.9 27.5 Q30.5 25.9 40.1 27.5 Q42.5 27.5 42.5 29.9 L42.5 32.6 Q42.5 35 40.1 35 Q30.5 33.4 20.9 35 Q18.5 35 18.5 32.6 Z"
          fill={`url(#${midGrad})`}
          stroke="#c7d2fe"
          strokeOpacity="0.18"
          strokeWidth="0.6"
        />
        <path
          d="M16.5 42.5 Q16.5 40 19 40 Q32 38.2 45 40 Q47.5 40 47.5 42.5 L47.5 45.5 Q47.5 48 45 48 Q32 46.2 19 48 Q16.5 48 16.5 45.5 Z"
          fill={`url(#${botGrad})`}
          stroke="#f5d0fe"
          strokeOpacity="0.3"
          strokeWidth="0.6"
          filter={`url(#${barGlow})`}
        />
      </g>
    </svg>
  );
}

export function MalIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#2E51A2" />
      <path
        d="M6 10.5H8.6L11 16.3L13.4 10.5H16V21.5H13.8V14.4L11.7 19.3H10.3L8.2 14.4V21.5H6V10.5ZM18.3 10.5H20.8L24.2 21.5H21.8L21.1 19H18L17.3 21.5H15L18.3 10.5ZM18.5 17H20.6L19.55 13.3L18.5 17ZM24.8 10.5H27V19.4H30V21.5H24.8V10.5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function AniListIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#1F2631" />
      <path
        d="M11.6 7.5L6.5 24.5H10.4L11.4 20.9H15.6L16.6 24.5H20.5L15.4 7.5H11.6ZM12.3 17.7L13.5 13.1L14.7 17.7H12.3Z"
        fill="#FFFFFF"
      />
      <path d="M18.5 7.5V24.5H26.5V21.1H22.2V7.5H18.5Z" fill="#02A9FF" />
    </svg>
  );
}

const SITE_STYLES: Array<{
  match: string[];
  bg: string;
  fg: string;
  label: string;
}> = [
  { match: ['crunchyroll'], bg: '#F47521', fg: '#FFFFFF', label: 'CR' },
  { match: ['netflix'], bg: '#E50914', fg: '#FFFFFF', label: 'N' },
  { match: ['hulu'], bg: '#1CE783', fg: '#040405', label: 'H' },
  { match: ['disney'], bg: '#113CCF', fg: '#FFFFFF', label: 'D+' },
  { match: ['youtube'], bg: '#FF0000', fg: '#FFFFFF', label: 'YT' },
  { match: ['bilibili'], bg: '#00A1D6', fg: '#FFFFFF', label: 'B' },
  { match: ['hidive'], bg: '#00BAFF', fg: '#040405', label: 'HD' },
  { match: ['amazon', 'prime'], bg: '#00A8E1', fg: '#FFFFFF', label: 'PV' },
  { match: ['mangaplus', 'manga plus'], bg: '#DC0914', fg: '#FFFFFF', label: 'M+' },
  { match: ['viz'], bg: '#FF4632', fg: '#FFFFFF', label: 'VZ' },
  { match: ['twitter', 'x.com'], bg: '#0F1419', fg: '#FFFFFF', label: 'X' },
  { match: ['anilist'], bg: '#02A9FF', fg: '#FFFFFF', label: 'AL' },
  { match: ['myanimelist'], bg: '#2E51A2', fg: '#FFFFFF', label: 'ML' },
];

export function ExternalSiteIcon({
  site,
  className = 'h-4 w-4',
}: {
  site: string;
  className?: string;
}) {
  const lower = site.toLowerCase();
  const matched = SITE_STYLES.find((s) => s.match.some((m) => lower.includes(m)));

  if (!matched) {
    return <Globe className={`${className} text-sky-400`} />;
  }

  return (
    <span
      className={`${className} inline-flex items-center justify-center rounded-[4px] font-bold text-[9px] leading-none shrink-0`}
      style={{ backgroundColor: matched.bg, color: matched.fg }}
      aria-hidden="true"
    >
      {matched.label}
    </span>
  );
}
