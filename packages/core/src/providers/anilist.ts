import type {
  AppUser,
  EntryUpdate,
  ListEntry,
  ListStatus,
  Media,
  MediaProvider,
  MediaType,
  Page,
  PopularKind,
  ProfileActivityEvent,
  ProfileActivityPoint,
  ProfileFavoriteItem,
  ScoreFormat,
  SearchFilters,
  UserProfileDetails,
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

const MEDIA_DETAIL_FIELDS = `
  ${MEDIA_FRAGMENT}
  trailer { id site }
  studios { nodes { name isAnimationStudio } }
  staff(perPage: 8, sort: [RELEVANCE]) {
    edges {
      role
      node { name { full } }
    }
  }
  tags { name rank isMediaSpoiler }
  rankings { rank type year allTime context }
  relations {
    edges {
      relationType
      node {
        id
        idMal
        type
        title { romaji english native }
        coverImage { large }
        format
        status
      }
    }
  }
  characters(sort: [ROLE, RELEVANCE], perPage: 12) {
    edges {
      role
      voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
        id
        name { full }
        image { large }
      }
      node {
        id
        name { full }
        image { large }
      }
    }
  }
  recommendations(sort: [RATING_DESC], perPage: 8) {
    nodes {
      mediaRecommendation {
        id
        idMal
        type
        title { romaji english native }
        coverImage { large }
        averageScore
      }
    }
  }
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
  trailer?: { id?: string | null; site?: string | null } | null;
  studios?: { nodes?: { name: string; isAnimationStudio: boolean }[] | null } | null;
  staff?: {
    edges?: { role?: string | null; node?: { name?: { full?: string | null } } }[] | null;
  } | null;
  tags?: { name: string; rank?: number | null; isMediaSpoiler?: boolean | null }[] | null;
  rankings?: {
    rank: number;
    type: 'RATED' | 'POPULAR';
    year?: number | null;
    allTime?: boolean | null;
    context: string;
  }[] | null;
  relations?: {
    edges?: Array<{
      relationType: string;
      node: {
        id: number;
        idMal?: number | null;
        type: MediaType;
        title?: { romaji?: string | null; english?: string | null; native?: string | null };
        coverImage?: { large?: string | null };
        format?: string | null;
        status?: string | null;
      };
    }> | null;
  } | null;
  characters?: {
    edges?: Array<{
      role?: string | null;
      voiceActors?: Array<{
        id: number;
        name?: { full?: string | null };
        image?: { large?: string | null };
      }> | null;
      node: {
        id: number;
        name?: { full?: string | null };
        image?: { large?: string | null };
      };
    }> | null;
  } | null;
  recommendations?: {
    nodes?: Array<{
      mediaRecommendation?: {
        id: number;
        idMal?: number | null;
        type: MediaType;
        title?: { romaji?: string | null; english?: string | null; native?: string | null };
        coverImage?: { large?: string | null };
        averageScore?: number | null;
      } | null;
    }> | null;
  } | null;
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
  const studioNodes = raw.studios?.nodes ?? [];
  const studios = studioNodes.filter((s) => s.isAnimationStudio).map((s) => s.name);
  const producersFromStudios = studioNodes
    .filter((s) => !s.isAnimationStudio)
    .map((s) => s.name);
  const staffCredits = (raw.staff?.edges ?? [])
    .map((e) => (e.node?.name?.full ? `${e.node.name.full}${e.role ? ` (${e.role})` : ''}` : ''))
    .filter(Boolean);
  const producers =
    producersFromStudios.length > 0 ? producersFromStudios : staffCredits;

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
    streamingLinks: (raw.externalLinks ?? []).map((l) => ({
      site: l.site,
      url: l.url,
    })),
    trailer:
      raw.trailer?.id && raw.trailer?.site
        ? { id: raw.trailer.id, site: raw.trailer.site }
        : undefined,
    studios: studios.length > 0 ? studios : undefined,
    producers: producers.length > 0 ? producers : undefined,
    tags: raw.tags
      ? raw.tags.map((t) => ({
          name: t.name,
          rank: t.rank ?? undefined,
          isSpoiler: Boolean(t.isMediaSpoiler),
        }))
      : undefined,
    rankings: raw.rankings
      ? raw.rankings.map((r) => ({
          rank: r.rank,
          type: r.type,
          year: r.year ?? undefined,
          allTime: Boolean(r.allTime),
          context: r.context,
        }))
      : undefined,
    relations: raw.relations?.edges
      ? raw.relations.edges.map((e) => ({
          relationType: e.relationType,
          id: `al:${e.node.id}`,
          alId: e.node.id,
          malId: e.node.idMal ?? undefined,
          type: e.node.type,
          title: {
            romaji: e.node.title?.romaji ?? undefined,
            english: e.node.title?.english ?? undefined,
            native: e.node.title?.native ?? undefined,
          },
          coverUrl: e.node.coverImage?.large ?? undefined,
          format: e.node.format ?? undefined,
          status: e.node.status ?? undefined,
        }))
      : undefined,
    characters: raw.characters?.edges
      ? raw.characters.edges.map((e) => ({
          id: e.node.id,
          name: e.node.name?.full ?? 'Unknown',
          imageUrl: e.node.image?.large ?? undefined,
          role: e.role ?? undefined,
          voiceActor: e.voiceActors?.[0]
            ? {
                id: e.voiceActors[0].id,
                name: e.voiceActors[0].name?.full ?? 'Unknown',
                imageUrl: e.voiceActors[0].image?.large ?? undefined,
              }
            : undefined,
        }))
      : undefined,
    recommendations: raw.recommendations?.nodes
      ? raw.recommendations.nodes
          .filter((n) => Boolean(n.mediaRecommendation))
          .map((n) => {
            const rec = n.mediaRecommendation!;
            return {
              id: `al:${rec.id}`,
              alId: rec.id,
              malId: rec.idMal ?? undefined,
              type: rec.type,
              title: {
                romaji: rec.title?.romaji ?? undefined,
                english: rec.title?.english ?? undefined,
                native: rec.title?.native ?? undefined,
              },
              coverUrl: rec.coverImage?.large ?? undefined,
              averageScore: rec.averageScore ?? undefined,
            };
          })
      : undefined,
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

export async function fetchAniListDetailsByMalId(
  malId: number,
  type: MediaType
): Promise<Media | null> {
  try {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: `
          query ($idMal: Int!, $type: MediaType!) {
            Media(idMal: $idMal, type: $type) {
              ${MEDIA_DETAIL_FIELDS}
            }
          }
        `,
        variables: { idMal: malId, type },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { Media?: AniListMediaRaw } };
    return json.data?.Media ? normalizeAniListMedia(json.data.Media) : null;
  } catch {
    return null;
  }
}

function stripIdPrefix(id: string): number {
  return Number(id.replace(/^al:/, ''));
}

function toIsoDateKey(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

function normalizeActivityLevel(amount: number): number {
  if (amount >= 6) return 4;
  if (amount >= 4) return 3;
  if (amount >= 2) return 2;
  if (amount > 0) return 1;
  return 0;
}

interface AniListFavoriteMediaNode {
  id: number;
  idMal?: number | null;
  type: MediaType;
  title?: { romaji?: string | null; english?: string | null; native?: string | null };
  coverImage?: { extraLarge?: string | null; large?: string | null };
  format?: string | null;
  averageScore?: number | null;
  seasonYear?: number | null;
}

function mapAniListFavoriteMedia(
  node: AniListFavoriteMediaNode,
  kind: 'ANIME' | 'MANGA'
): ProfileFavoriteItem {
  return {
    id: `al:${node.id}`,
    kind,
    title: node.title?.english ?? node.title?.romaji ?? node.title?.native ?? 'Untitled',
    subtitle: [node.format, node.seasonYear].filter(Boolean).join(' · ') || undefined,
    imageUrl: node.coverImage?.extraLarge ?? node.coverImage?.large ?? undefined,
    mediaType: node.type,
    score: node.averageScore ?? undefined,
  };
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

  async getProfileDetails(): Promise<UserProfileDetails> {
    if (!this.cachedUserId) {
      await this.getCurrentUser();
    }

    interface AniListProfileRaw {
      User?: {
        bannerImage?: string | null;
        about?: string | null;
        stats?: {
          activityHistory?: { date: number; amount: number; level: number }[] | null;
        } | null;
        favourites?: {
          anime?: { nodes?: AniListFavoriteMediaNode[] | null } | null;
          manga?: { nodes?: AniListFavoriteMediaNode[] | null } | null;
          characters?: {
            nodes?: {
              id: number;
              name?: { full?: string | null };
              image?: { large?: string | null };
            }[] | null;
          } | null;
        } | null;
      } | null;
      Page?: {
        activities?: Array<{
          id?: number;
          status?: string | null;
          progress?: string | null;
          createdAt?: number | null;
          media?: {
            id: number;
            idMal?: number | null;
            type: MediaType;
            title?: { romaji?: string | null; english?: string | null; native?: string | null };
            coverImage?: { extraLarge?: string | null; large?: string | null };
          } | null;
        }> | null;
      } | null;
    }

    const data = await this.gql<AniListProfileRaw>(
      `
      query ($userId: Int!) {
        User(id: $userId) {
          id
          name
          bannerImage
          about(asHtml: false)
          stats {
            activityHistory {
              date
              amount
              level
            }
          }
          favourites {
            anime(page: 1, perPage: 12) {
              nodes {
                id
                idMal
                type
                title { romaji english native }
                coverImage { extraLarge large }
                format
                averageScore
                seasonYear
              }
            }
            manga(page: 1, perPage: 12) {
              nodes {
                id
                idMal
                type
                title { romaji english native }
                coverImage { extraLarge large }
                format
                averageScore
                seasonYear
              }
            }
            characters(page: 1, perPage: 12) {
              nodes {
                id
                name { full }
                image { large }
              }
            }
          }
        }
        Page(page: 1, perPage: 16) {
          activities(userId: $userId, type: MEDIA_LIST, sort: ID_DESC) {
            ... on ListActivity {
              id
              status
              progress
              createdAt
              media {
                id
                idMal
                type
                title { romaji english native }
                coverImage { extraLarge large }
              }
            }
          }
        }
      }
      `,
      { userId: this.cachedUserId }
    );

    const activityHistory: ProfileActivityPoint[] = (
      data.User?.stats?.activityHistory ?? []
    ).map((pt) => ({
      date: toIsoDateKey(pt.date),
      timestamp: pt.date,
      amount: pt.amount,
      level: normalizeActivityLevel(pt.amount),
    }));

    const animeFavs = (data.User?.favourites?.anime?.nodes ?? []).map((n) =>
      mapAniListFavoriteMedia(n, 'ANIME')
    );
    const mangaFavs = (data.User?.favourites?.manga?.nodes ?? []).map((n) =>
      mapAniListFavoriteMedia(n, 'MANGA')
    );
    const characterFavs: ProfileFavoriteItem[] = (
      data.User?.favourites?.characters?.nodes ?? []
    ).map((c) => ({
      id: `char:${c.id}`,
      kind: 'CHARACTER',
      title: c.name?.full ?? 'Unknown',
      imageUrl: c.image?.large ?? undefined,
    }));

    const recentActivities: ProfileActivityEvent[] = [];
    for (const act of data.Page?.activities ?? []) {
      if (!act?.id || !act.media) continue;
      recentActivities.push({
        id: String(act.id),
        status: act.status ?? 'updated',
        progress: act.progress ?? undefined,
        createdAt: (act.createdAt ?? Math.floor(Date.now() / 1000)) * 1000,
        media: {
          id: `al:${act.media.id}`,
          type: act.media.type,
          title: {
            romaji: act.media.title?.romaji ?? undefined,
            english: act.media.title?.english ?? undefined,
            native: act.media.title?.native ?? undefined,
          },
          coverUrl:
            act.media.coverImage?.extraLarge ?? act.media.coverImage?.large ?? undefined,
        },
      });
    }

    return {
      bannerUrl: data.User?.bannerImage ?? undefined,
      about: data.User?.about ?? undefined,
      activityHistory,
      favorites: {
        anime: animeFavs,
        manga: mangaFavs,
        characters: characterFavs,
      },
      recentActivities,
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
        $tag: String
        $seasonYear: Int
        $season: MediaSeason
        $format: MediaFormat
        $status: MediaStatus
        $averageScore_greater: Int
        $sort: [MediaSort]
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
            tag: $tag
            seasonYear: $seasonYear
            season: $season
            format: $format
            status: $status
            averageScore_greater: $averageScore_greater
            isAdult: $isAdult
            sort: $sort
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
        tag: filters.tag || undefined,
        seasonYear: filters.year || undefined,
        season: filters.season || undefined,
        format: filters.format || undefined,
        status: filters.status || undefined,
        averageScore_greater:
          filters.minScore && filters.minScore > 0 ? filters.minScore - 1 : undefined,
        sort: [filters.sort ?? 'POPULARITY_DESC'],
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
          ${MEDIA_DETAIL_FIELDS}
        }
      }
      `,
      { id: stripIdPrefix(id) }
    );
    return normalizeAniListMedia(data.Media);
  }

  async getPopular(
    type: MediaType,
    kind: PopularKind,
    page = 1
  ): Promise<Page<Media>> {
    const sort =
      kind === 'trending'
        ? ['TRENDING_DESC']
        : kind === 'toprated'
          ? ['SCORE_DESC']
          : ['POPULARITY_DESC'];

    const now = new Date();
    const month = now.getMonth() + 1;
    const currentSeason =
      month <= 3 ? 'WINTER' : month <= 6 ? 'SPRING' : month <= 9 ? 'SUMMER' : 'FALL';
    const nextSeasonMap: Record<string, { season: string; yearOffset: number }> = {
      WINTER: { season: 'SPRING', yearOffset: 0 },
      SPRING: { season: 'SUMMER', yearOffset: 0 },
      SUMMER: { season: 'FALL', yearOffset: 0 },
      FALL: { season: 'WINTER', yearOffset: 1 },
    };
    const nextInfo = nextSeasonMap[currentSeason];

    const season =
      type !== 'ANIME'
        ? undefined
        : kind === 'season'
          ? currentSeason
          : kind === 'upcoming'
            ? nextInfo.season
            : undefined;
    const seasonYear =
      type !== 'ANIME'
        ? undefined
        : kind === 'season'
          ? now.getFullYear()
          : kind === 'upcoming'
            ? now.getFullYear() + nextInfo.yearOffset
            : undefined;
    const status = kind === 'upcoming' ? 'NOT_YET_RELEASED' : undefined;

    const data = await this.gql<{
      Page: {
        pageInfo: { hasNextPage: boolean; total?: number };
        media: AniListMediaRaw[];
      };
    }>(
      `
      query ($type: MediaType!, $sort: [MediaSort], $season: MediaSeason, $seasonYear: Int, $status: MediaStatus, $page: Int) {
        Page(page: $page, perPage: 24) {
          pageInfo { hasNextPage total }
          media(
            type: $type
            sort: $sort
            season: $season
            seasonYear: $seasonYear
            status: $status
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
        season,
        seasonYear,
        status,
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
