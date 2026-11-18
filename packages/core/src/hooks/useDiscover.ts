import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AniListProvider, normalizeAniListMedia } from '../providers/anilist';
import type {
  Media,
  MediaType,
  Page,
  PopularKind,
  SearchFilters,
} from '../providers/types';
import { useProvider } from './useList';
import { useSettingsStore } from './useSettingsSync';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useMediaSearch(
  query: string,
  filters: SearchFilters,
  apiBase = ''
) {
  const provider = useProvider(apiBase);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  return useQuery<Page<Media>>({
    queryKey: ['mediaSearch', provider?.id, debouncedQuery, filters],
    enabled: Boolean(
      provider &&
        (debouncedQuery.length > 0 ||
          filters.genre ||
          filters.year ||
          filters.season ||
          filters.format ||
          filters.status ||
          filters.minScore)
    ),
    queryFn: async () => {
      if (!provider) return { items: [], hasNextPage: false };
      return provider.search(debouncedQuery, filters);
    },
    staleTime: 1000 * 60 * 3,
  });
}

export function usePopularMedia(
  type: MediaType,
  kind: PopularKind,
  page = 1,
  apiBase = ''
) {
  const provider = useProvider(apiBase);

  return useQuery<Page<Media>>({
    queryKey: ['popularMedia', provider?.id, type, kind, page],
    enabled: Boolean(provider),
    queryFn: async () => {
      if (!provider) return { items: [], hasNextPage: false };
      return provider.getPopular(type, kind, page);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export type NewReleaseTab = 'just_aired' | 'this_season' | 'announced';

export interface NewReleaseItem {
  media: Media;
  episode?: number;
  airingAt?: number;
}

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const NEW_RELEASE_MEDIA_FIELDS = `
  id
  idMal
  type
  title { romaji english native }
  coverImage { extraLarge large }
  bannerImage
  description(asHtml: false)
  genres
  format
  status
  episodes
  chapters
  volumes
  averageScore
  season
  seasonYear
  isAdult
  nextAiringEpisode { episode airingAt }
`;

async function queryAniListPublic<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error('Empty AniList response');
  return json.data;
}

export function useNewReleases(type: MediaType, tab: NewReleaseTab) {
  const showAdult = useSettingsStore((s) => s.settings.show_adult);

  return useQuery<NewReleaseItem[]>({
    queryKey: ['newReleases', type, tab, showAdult],
    queryFn: async () => {
      if (tab === 'just_aired' && type === 'ANIME') {
        const nowSec = Math.floor(Date.now() / 1000);
        const twoDaysAgo = nowSec - 48 * 3600;
        const data = await queryAniListPublic<{
          Page: {
            airingSchedules: Array<{
              episode: number;
              airingAt: number;
              media: Parameters<typeof normalizeAniListMedia>[0];
            }>;
          };
        }>(
          `
          query ($start: Int!, $end: Int!) {
            Page(page: 1, perPage: 40) {
              airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: [TIME_DESC]) {
                episode
                airingAt
                media { ${NEW_RELEASE_MEDIA_FIELDS} }
              }
            }
          }
          `,
          { start: twoDaysAgo, end: nowSec }
        );

        const seen = new Set<number>();
        const results: NewReleaseItem[] = [];
        for (const row of data.Page.airingSchedules) {
          if (!showAdult && row.media.isAdult) continue;
          if (seen.has(row.media.id)) continue;
          seen.add(row.media.id);
          results.push({
            media: normalizeAniListMedia(row.media),
            episode: row.episode,
            airingAt: row.airingAt,
          });
        }
        return results;
      }

      if (tab === 'this_season') {
        if (type === 'ANIME') {
          const page = await new AniListProvider().getPopular('ANIME', 'season', 1);
          return page.items.map((media) => ({ media }));
        }
        const data = await queryAniListPublic<{
          Page: { media: Parameters<typeof normalizeAniListMedia>[0][] };
        }>(
          `
          query ($isAdult: Boolean) {
            Page(page: 1, perPage: 24) {
              media(type: MANGA, status: RELEASING, sort: [START_DATE_DESC, POPULARITY_DESC], isAdult: $isAdult) {
                ${NEW_RELEASE_MEDIA_FIELDS}
              }
            }
          }
          `,
          { isAdult: showAdult ? undefined : false }
        );
        return data.Page.media.map((m) => ({ media: normalizeAniListMedia(m) }));
      }

      const data = await queryAniListPublic<{
        Page: { media: Parameters<typeof normalizeAniListMedia>[0][] };
      }>(
        `
        query ($type: MediaType!, $isAdult: Boolean) {
          Page(page: 1, perPage: 24) {
            media(type: $type, status: NOT_YET_RELEASED, sort: [ID_DESC], isAdult: $isAdult) {
              ${NEW_RELEASE_MEDIA_FIELDS}
            }
          }
        }
        `,
        { type, isAdult: showAdult ? undefined : false }
      );
      return data.Page.media.map((m) => ({ media: normalizeAniListMedia(m) }));
    },
    staleTime: 1000 * 60 * 5,
  });
}
