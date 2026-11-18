import type { AuthSession } from '../auth/store';
import { AniListProvider } from './anilist';
import { MalProvider } from './mal';
import type { Media, MediaProvider, ScoreFormat } from './types';

export * from './types';
export { AniListProvider, normalizeAniListMedia } from './anilist';
export { MalProvider } from './mal';

export function createProvider(session: AuthSession, apiBase = ''): MediaProvider {
  if (session.provider === 'mal') {
    return new MalProvider(apiBase, session.providerAccessToken);
  }
  return new AniListProvider(session.providerAccessToken);
}

export function shortenTitleText(raw: string, maxLength = 38): string {
  const clean = raw.trim();
  if (clean.length <= maxLength) return clean;

  // Strip verbose subtitle suffixes if the main title remains meaningful
  const stripped = clean
    .replace(/\s*[:\-–—]\s+.+$/, '')
    .replace(/\s+\([^)]*\)\s*$/, '')
    .trim();
  if (stripped.length >= 8 && stripped.length <= maxLength) {
    return stripped;
  }

  const base = stripped.length >= 8 ? stripped : clean;
  const cut = base.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 12 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function formatMediaTitle(
  media: Pick<Media, 'title'>,
  preferred: 'romaji' | 'english' | 'native' = 'romaji',
  short = false
): string {
  const primary =
    preferred === 'english'
      ? media.title.english || media.title.romaji || media.title.native || 'Untitled'
      : preferred === 'native'
        ? media.title.native || media.title.romaji || media.title.english || 'Untitled'
        : media.title.romaji || media.title.english || media.title.native || 'Untitled';

  if (!short || primary.length <= 36) return primary;

  // Prefer the shortest available Latin title if primary is very long
  const candidates = [media.title.english, media.title.romaji].filter(
    (t): t is string => Boolean(t && t.trim().length > 2)
  );
  const shortest = candidates.sort((a, b) => a.length - b.length)[0] ?? primary;
  return shortenTitleText(shortest, 38);
}

export function formatScore(score100?: number, format: ScoreFormat = 'POINT_10'): string {
  if (!score100 || score100 <= 0) return '—';
  switch (format) {
    case 'POINT_100':
      return `${Math.round(score100)}`;
    case 'POINT_10_DECIMAL':
      return (score100 / 10).toFixed(1);
    case 'POINT_5':
      return `${Math.round(score100 / 20)}★`;
    case 'POINT_3':
      return score100 >= 75 ? ':)' : score100 >= 45 ? ':|' : ':(';
    case 'POINT_10':
    default:
      return `${Math.round(score100 / 10)}`;
  }
}
