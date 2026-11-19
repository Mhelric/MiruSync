import { useId } from 'react';
import { Globe } from 'lucide-react';

export function MiruSyncLogo({ className = 'h-8 w-8' }: { className?: string }) {
  const gradId = useId();
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#090d1a" className="ms-logo-bg transition-colors" />
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="14"
        stroke={`url(#${gradId})`}
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      <path
        d="M12 43V21L21 34L30 21V43"
        stroke="#F8FAFC"
        className="ms-logo-m transition-colors"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M51 23.5C50 21.5 47.8 20.5 44.8 20.5C41 20.5 38.5 22.5 38.5 25.5C38.5 28.5 41.2 30 44.8 31.2C48.8 32.5 51.5 34 51.5 37.5C51.5 41 48.5 43.2 44.5 43.2C41 43.2 38.6 41.8 37.5 39.5"
        stroke={`url(#${gradId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
