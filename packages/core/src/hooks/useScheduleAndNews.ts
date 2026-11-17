import { useQuery } from '@tanstack/react-query';
import { formatMediaTitle } from '../providers';

export interface AiringScheduleItem {
  id: number;
  episode: number;
  airingAt: number; // unix seconds
  media: {
    id: string;
    alId: number;
    malId?: number;
    title: { romaji?: string; english?: string; native?: string };
    coverUrl?: string;
    format?: string;
    episodes?: number;
  };
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  snippet: string;
  publishedAt: string;
  source: string;
}

export function useAiringSchedule(apiBase = '') {
  return useQuery<{ items: AiringScheduleItem[]; generatedAt: number }>({
    queryKey: ['airingSchedule'],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/schedule`);
      if (!res.ok) throw new Error(`Schedule fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useAnimeNews(apiBase = '') {
  return useQuery<{ items: NewsItem[]; generatedAt: number }>({
    queryKey: ['animeNews'],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/news`);
      if (!res.ok) throw new Error(`News fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60 * 15,
  });
}

export function formatCountdown(airingAtUnix: number): string {
  const diffSec = airingAtUnix - Math.floor(Date.now() / 1000);
  if (diffSec <= 0) return 'Aired';
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function toIcsDate(unixSec: number): string {
  return new Date(unixSec * 1000)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function buildIcsCalendar(items: AiringScheduleItem[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MiruSync//Airing Schedule//EN',
    'CALSCALE:GREGORIAN',
  ];

  for (const item of items) {
    const title = formatMediaTitle(item.media, 'romaji');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:mirusync-${item.id}@mirusync.app`);
    lines.push(`DTSTART:${toIcsDate(item.airingAt)}`);
    lines.push(`DTEND:${toIcsDate(item.airingAt + 1800)}`);
    lines.push(`SUMMARY:${title} - Episode ${item.episode}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
