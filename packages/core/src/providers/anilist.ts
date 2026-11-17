import type {
  AppUser,
  EntryUpdate,
  ListEntry,
  ListStatus,
  Media,
  MediaProvider,
  MediaType,
  Page,
  ScoreFormat,
  SearchFilters,
} from './types';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

const MEDIA_FRAGMENT = `
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
  externalLinks { site url type }
`;

interface AniListMediaRaw {
  id: number;
  idMal?: number | null;
  type: MediaType;
  title?: { romaji?: string | null; english?: string | null; native?: string | null };
  coverImage?: { extraLarge?: string | null; large?: string | null };
  bannerImage?: string | null;
  description?: string | null;
  genres?: string[] | null;
  format?: string | null;
  status?: string | null;
  episodes?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  averageScore?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  isAdult?: boolean | null;
  nextAiringEpisode?: { episode: number; airingAt: number } | null;
  externalLinks?: { site: string; url: string; type?: string }[] | null;
}

interface AniListEntryRaw {
  id: number;
  status: ListStatus;
  progress: number;
  progressVolumes?: number | null;
  score: number;
  repeat?: number | null;
  notes?: string | null;
  updatedAt?: number | null;
  startedAt?: { year?: number | null; month?: number | null; day?: number | null } | null;
  completedAt?: { year?: number | null; month?: number | null; day?: number | null } | null;
  media: AniListMediaRaw;
}

function formatFuzzyDate(
  d?: { year?: number | null; month?: number | null; day?: number | null } | null
): string | undefined {
  if (!d?.year || !d?.month || !d?.day) return undefined;
  return `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function parseFuzzyDate(iso?: string): { year: number; month: number; day: number } | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return { year: y, month: m, day: d };
}

export function normalizeAniListMedia(raw: AniListMediaRaw): Media {
  return {
    id: `al:${raw.id}`,
    alId: raw.id,
    malId: raw.idMal ?? undefined,
    type: raw.type,
    title: {
      romaji: raw.title?.romaji ?? undefined,
      english: raw.title?.english ?? undefined,
      native: raw.title?.native ?? undefined,
    },
    coverUrl: raw.coverImage?.extraLarge ?? raw.coverImage?.large ?? undefined,
    bannerUrl: raw.bannerImage ?? undefined,
    synopsis: raw.description ?? undefined,
    genres: raw.genres ?? [],
    format: raw.format ?? undefined,
    status: raw.status ?? undefined,
    episodes: raw.episodes ?? undefined,
    chapters: raw.chapters ?? undefined,
    volumes: raw.volumes ?? undefined,
    averageScore: raw.averageScore ?? undefined,
    season: raw.season ?? undefined,
    seasonYear: raw.seasonYear ?? undefined,
    nextAiring: raw.nextAiringEpisode ?? undefined,
    isAdult: Boolean(raw.isAdult),
    streamingLinks: (raw.externalLinks ?? [])
      .filter((l) => l.type === 'STREAMING')
      .map((l) => ({ site: l.site, url: l.url })),
  };
}

function normalizeAniListEntry(raw: AniListEntryRaw): ListEntry {
  return {
    media: normalizeAniListMedia(raw.media),
    status: raw.status,
    progress: raw.progress ?? 0,
    progressVolumes: raw.progressVolumes ?? undefined,
    score: raw.score > 0 ? raw.score : undefined,
    startedAt: formatFuzzyDate(raw.startedAt),
    completedAt: formatFuzzyDate(raw.completedAt),
    repeat: raw.repeat ?? undefined,
    notes: raw.notes ?? undefined,
    updatedAt: (raw.updatedAt ?? Math.floor(Date.now() / 1000)) * 1000,
  };
}

function stripIdPrefix(id: string): number {
  return Number(id.replace(/^al:/, ''));
}

export class AniListProvider implements MediaProvider {
  id = 'anilist' as const;
  private accessToken?: string;
  private cachedUserId?: number;

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
  }

  private async gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      throw new Error(`AniList API error: ${res.status}`);
    }

    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (json.errors?.length) {
      throw new Error(json.errors[0].message);
    }
    if (!json.data) {
      throw new Error('AniList returned empty response');
    }
    return json.data;
  }

  async getCurrentUser(): Promise<AppUser> {
    const data = await this.gql<{
      Viewer: {
        id: number;
        name: string;
        avatar?: { large?: string };
        mediaListOptions?: { scoreFormat?: ScoreFormat };
      };
    }>(`
      query {
        Viewer {
          id
          name
          avatar { large }
          mediaListOptions { scoreFormat }
        }
      }
    `);

    this.cachedUserId = data.Viewer.id;
    return {
      provider: 'anilist',
      id: `al:${data.Viewer.id}`,
      name: data.Viewer.name,
      avatarUrl: data.Viewer.avatar?.large,
      scoreFormat: data.Viewer.mediaListOptions?.scoreFormat ?? 'POINT_10',
    };
  }

  async getList(type: MediaType, status?: ListStatus): Promise<ListEntry[]> {
    if (!this.cachedUserId) {
      await this.getCurrentUser();
    }

    const data = await this.gql<{
      MediaListCollection: {
        lists: { entries: AniListEntryRaw[] }[];
      };
    }>(
      `
      query ($userId: Int!, $type: MediaType!, $status: MediaListStatus) {
        MediaListCollection(userId: $userId, type: $type, status: $status, forceSingleCompletedList: true) {
          lists {
            entries {
              id
              status
              progress
              progressVolumes
              score(format: POINT_100)
              repeat
              notes
              updatedAt
              startedAt { year month day }
              completedAt { year month day }
              media { ${MEDIA_FRAGMENT} }
            }
          }
        }
      }
      `,
      { userId: this.cachedUserId, type, status }
    );

    const seen = new Set<string>();
    const entries: ListEntry[] = [];
    for (const list of data.MediaListCollection.lists) {
      for (const raw of list.entries) {
        const normalized = normalizeAniListEntry(raw);
        if (!seen.has(normalized.media.id)) {
          seen.add(normalized.media.id);
          entries.push(normalized);
        }
      }
    }
    return entries.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async updateEntry(entry: EntryUpdate): Promise<ListEntry> {
    const variables: Record<string, unknown> = {
      mediaId: stripIdPrefix(entry.mediaId),
      status: entry.status,
      progress: entry.progress,
      progressVolumes: entry.progressVolumes,
      scoreRaw: entry.score !== undefined ? Math.round(entry.score) : undefined,
      repeat: entry.repeat,
      notes: entry.notes,
      startedAt: parseFuzzyDate(entry.startedAt),
      completedAt: parseFuzzyDate(entry.completedAt),
    };

    const data = await this.gql<{ SaveMediaListEntry: AniListEntryRaw }>(
      `
      mutation (
        $mediaId: Int!
        $status: MediaListStatus
        $progress: Int
        $progressVolumes: Int
        $scoreRaw: Int
        $repeat: Int
        $notes: String
        $startedAt: FuzzyDateInput
        $completedAt: FuzzyDateInput
      ) {
        SaveMediaListEntry(
          mediaId: $mediaId
          status: $status
          progress: $progress
          progressVolumes: $progressVolumes
          scoreRaw: $scoreRaw
          repeat: $repeat
          notes: $notes
          startedAt: $startedAt
          completedAt: $completedAt
        ) {
          id
          status
          progress
          progressVolumes
          score(format: POINT_100)
          repeat
          notes
          updatedAt
          startedAt { year month day }
          completedAt { year month day }
          media { ${MEDIA_FRAGMENT} }
        }
      }
      `,
      variables
    );

    return normalizeAniListEntry(data.SaveMediaListEntry);
  }

  async deleteEntry(mediaId: string, type: MediaType): Promise<void> {
    if (!this.cachedUserId) {
      await this.getCurrentUser();
    }
    const alMediaId = stripIdPrefix(mediaId);
    const listData = await this.gql<{ MediaList?: { id: number } }>(
      `
      query ($userId: Int!, $mediaId: Int!, $type: MediaType!) {
        MediaList(userId: $userId, mediaId: $mediaId, type: $type) {
          id
        }
      }
      `,
      { userId: this.cachedUserId, mediaId: alMediaId, type }
    );

    if (!listData.MediaList?.id) return;

    await this.gql(
      `
      mutation ($id: Int!) {
        DeleteMediaListEntry(id: $id) {
          deleted
        }
      }
      `,
      { id: listData.MediaList.id }
    );
  }

  async search(query: string, filters: SearchFilters): Promise<Page<Media>> {
    const data = await this.gql<{
      Page: {
        pageInfo: { hasNextPage: boolean; total?: number };
        media: AniListMediaRaw[];
      };
    }>(
      `
      query (
        $search: String
        $type: MediaType!
        $genre: String
        $seasonYear: Int
        $season: MediaSeason
        $format: MediaFormat
        $status: MediaStatus
        $isAdult: Boolean
        $page: Int
        $perPage: Int
      ) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage total }
          media(
            search: $search
            type: $type
            genre: $genre
            seasonYear: $seasonYear
            season: $season
            format: $format
            status: $status
            isAdult: $isAdult
            sort: [POPULARITY_DESC]
          ) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
      `,
      {
        search: query || undefined,
        type: filters.type,
        genre: filters.genre || undefined,
        seasonYear: filters.year || undefined,
        season: filters.season || undefined,
        format: filters.format || undefined,
        status: filters.status || undefined,
        isAdult: filters.includeAdult ? undefined : false,
        page: filters.page ?? 1,
        perPage: filters.perPage ?? 24,
      }
    );

    return {
      items: data.Page.media.map(normalizeAniListMedia),
      hasNextPage: data.Page.pageInfo.hasNextPage,
      total: data.Page.pageInfo.total,
    };
  }

  async getMedia(id: string, _type: MediaType): Promise<Media> {
    const data = await this.gql<{ Media: AniListMediaRaw }>(
      `
      query ($id: Int!) {
        Media(id: $id) {
          ${MEDIA_FRAGMENT}
        }
      }
      `,
      { id: stripIdPrefix(id) }
    );
    return normalizeAniListMedia(data.Media);
  }

  async getPopular(
    type: MediaType,
    kind: 'trending' | 'season' | 'alltime',
    page = 1
  ): Promise<Page<Media>> {
    const sort =
      kind === 'trending' ? ['TRENDING_DESC'] : ['POPULARITY_DESC'];

    const now = new Date();
    const month = now.getMonth() + 1;
    const currentSeason =
      month <= 3 ? 'WINTER' : month <= 6 ? 'SPRING' : month <= 9 ? 'SUMMER' : 'FALL';

    const data = await this.gql<{
      Page: {
        pageInfo: { hasNextPage: boolean; total?: number };
        media: AniListMediaRaw[];
      };
    }>(
      `
      query ($type: MediaType!, $sort: [MediaSort], $season: MediaSeason, $seasonYear: Int, $page: Int) {
        Page(page: $page, perPage: 24) {
          pageInfo { hasNextPage total }
          media(
            type: $type
            sort: $sort
            season: $season
            seasonYear: $seasonYear
            isAdult: false
          ) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
      `,
      {
        type,
        sort,
        season: kind === 'season' && type === 'ANIME' ? currentSeason : undefined,
        seasonYear: kind === 'season' && type === 'ANIME' ? now.getFullYear() : undefined,
        page,
      }
    );

    return {
      items: data.Page.media.map(normalizeAniListMedia),
      hasNextPage: data.Page.pageInfo.hasNextPage,
      total: data.Page.pageInfo.total,
    };
  }
}
