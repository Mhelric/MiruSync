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

export function formatMediaTitle(
  media: Pick<Media, 'title'>,
  preferred: 'romaji' | 'english' | 'native' = 'romaji'
): string {
  if (preferred === 'english') {
    return media.title.english || media.title.romaji || media.title.native || 'Untitled';
  }
  if (preferred === 'native') {
    return media.title.native || media.title.romaji || media.title.english || 'Untitled';
  }
  return media.title.romaji || media.title.english || media.title.native || 'Untitled';
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
