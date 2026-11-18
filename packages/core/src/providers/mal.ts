import { AniListProvider, fetchAniListDetailsByMalId } from './anilist';
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
  ProfileFavoriteItem,
  SearchFilters,
  UserProfileDetails,
} from './types';

const MAL_ANIME_FIELDS = [
  'id',
  'title',
  'main_picture',
  'alternative_titles',
  'synopsis',
  'genres',
  'media_type',
  'status',
  'num_episodes',
  'mean',
  'start_season',
  'nsfw',
].join(',');

const MAL_MANGA_FIELDS = [
  'id',
  'title',
  'main_picture',
  'alternative_titles',
  'synopsis',
  'genres',
  'media_type',
  'status',
  'num_chapters',
  'num_volumes',
  'mean',
  'nsfw',
].join(',');

interface MalNodeRaw {
  id: number;
  title: string;
  main_picture?: { large?: string; medium?: string };
  alternative_titles?: { en?: string; ja?: string };
  synopsis?: string;
  genres?: { id: number; name: string }[];
  media_type?: string;
  status?: string;
  num_episodes?: number;
  num_chapters?: number;
  num_volumes?: number;
  mean?: number;
  start_season?: { year: number; season: string };
  nsfw?: 'white' | 'gray' | 'black';
}

interface MalListStatusRaw {
  status: string;
  score: number;
  num_episodes_watched?: number;
  num_chapters_read?: number;
  num_volumes_read?: number;
  is_rewatching?: boolean;
  is_rereading?: boolean;
  start_date?: string;
  finish_date?: string;
  num_times_rewatched?: number;
  num_times_reread?: number;
  comments?: string;
  updated_at?: string;
}

function toMalStatus(status: ListStatus, type: MediaType): string {
  if (type === 'ANIME') {
    switch (status) {
      case 'CURRENT':
      case 'REPEATING':
        return 'watching';
      case 'PLANNING':
        return 'plan_to_watch';
      case 'COMPLETED':
        return 'completed';
      case 'PAUSED':
        return 'on_hold';
      case 'DROPPED':
        return 'dropped';
    }
  }
  switch (status) {
    case 'CURRENT':
    case 'REPEATING':
      return 'reading';
    case 'PLANNING':
      return 'plan_to_read';
    case 'COMPLETED':
      return 'completed';
    case 'PAUSED':
      return 'on_hold';
    case 'DROPPED':
      return 'dropped';
  }
}

function fromMalStatus(raw: MalListStatusRaw): ListStatus {
  if (raw.is_rewatching || raw.is_rereading) return 'REPEATING';
  switch (raw.status) {
    case 'watching':
    case 'reading':
      return 'CURRENT';
    case 'plan_to_watch':
    case 'plan_to_read':
      return 'PLANNING';
    case 'completed':
      return 'COMPLETED';
    case 'on_hold':
      return 'PAUSED';
    case 'dropped':
      return 'DROPPED';
    default:
      return 'PLANNING';
  }
}

function normalizeMalMedia(node: MalNodeRaw, type: MediaType): Media {
  return {
    id: `mal:${node.id}`,
    malId: node.id,
    type,
    title: {
      romaji: node.title,
      english: node.alternative_titles?.en || undefined,
      native: node.alternative_titles?.ja || undefined,
    },
    coverUrl: node.main_picture?.large ?? node.main_picture?.medium,
    synopsis: node.synopsis,
    genres: (node.genres ?? []).map((g) => g.name),
    format: node.media_type?.toUpperCase(),
    status: node.status?.toUpperCase(),
    episodes: node.num_episodes,
    chapters: node.num_chapters,
    volumes: node.num_volumes,
    averageScore: node.mean ? Math.round(node.mean * 10) : undefined,
    season: node.start_season?.season?.toUpperCase(),
    seasonYear: node.start_season?.year,
    isAdult: node.nsfw !== undefined && node.nsfw !== 'white',
  };
}

function stripMalPrefix(id: string): string {
  return id.replace(/^mal:/, '');
}

export class MalProvider implements MediaProvider {
  id = 'mal' as const;
  private apiBase: string;
  private mobileToken?: string;

  constructor(apiBase = '', mobileToken?: string) {
    this.apiBase = apiBase;
    this.mobileToken = mobileToken;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (this.mobileToken) {
      headers.set('x-mal-token', this.mobileToken);
    }

    const res = await fetch(
      `${this.apiBase}/api/mal-proxy?path=${encodeURIComponent(path)}`,
      {
        ...init,
        headers,
        credentials: 'include',
      }
    );

    if (!res.ok) {
      throw new Error(`MAL API error: ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  async getCurrentUser(): Promise<AppUser> {
    const me = await this.request<{ id: number; name: string; picture?: string }>(
      '/v2/users/@me'
    );
    return {
      provider: 'mal',
      id: `mal:${me.id}`,
      name: me.name,
      avatarUrl: me.picture,
      scoreFormat: 'POINT_10',
    };
  }

  async getProfileDetails(): Promise<UserProfileDetails> {
    const me = await this.getCurrentUser();
    const emptyFavorites: UserProfileDetails['favorites'] = {
      anime: [],
      manga: [],
      characters: [],
    };

    interface JikanFavItemRaw {
      mal_id: number;
      title?: string;
      name?: string;
      type?: string;
      start_year?: number;
      images?: { jpg?: { image_url?: string }; webp?: { image_url?: string } };
    }

    const mapJikanGroup = (
      items: JikanFavItemRaw[] | undefined,
      kind: ProfileFavoriteItem['kind']
    ): ProfileFavoriteItem[] =>
      (items ?? []).slice(0, 12).map((item) => ({
        id: kind === 'CHARACTER' ? `char:${item.mal_id}` : `mal:${item.mal_id}`,
        kind,
        title: item.title ?? item.name ?? 'Unknown',
        subtitle:
          kind === 'CHARACTER'
            ? undefined
            : [item.type, item.start_year].filter(Boolean).join(' · ') || undefined,
        imageUrl: item.images?.jpg?.image_url ?? item.images?.webp?.image_url,
        mediaType: kind === 'CHARACTER' ? undefined : kind,
      }));

    try {
      const res = await fetch(
        `https://api.jikan.moe/v4/users/${encodeURIComponent(me.name)}/favorites`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          data?: {
            anime?: JikanFavItemRaw[];
            manga?: JikanFavItemRaw[];
            characters?: JikanFavItemRaw[];
          };
        };
        if (json.data) {
          return {
            activityHistory: [],
            favorites: {
              anime: mapJikanGroup(json.data.anime, 'ANIME'),
              manga: mapJikanGroup(json.data.manga, 'MANGA'),
              characters: mapJikanGroup(json.data.characters, 'CHARACTER'),
            },
            recentActivities: [],
          };
        }
      }
    } catch {
      // Fall back to empty provider favorites when Jikan times out or is unreachable
    }

    return {
      activityHistory: [],
      favorites: emptyFavorites,
      recentActivities: [],
    };
  }

  async getList(type: MediaType, status?: ListStatus): Promise<ListEntry[]> {
    const resource = type === 'ANIME' ? 'animelist' : 'mangalist';
    const fields = type === 'ANIME' ? MAL_ANIME_FIELDS : MAL_MANGA_FIELDS;
    const params = new URLSearchParams({
      fields: `list_status{status,score,num_episodes_watched,num_chapters_read,num_volumes_read,is_rewatching,is_rereading,start_date,finish_date,num_times_rewatched,num_times_reread,comments,updated_at},${fields}`,
      limit: '1000',
      sort: 'list_updated_at',
      nsfw: 'true',
    });
    if (status) {
      params.set('status', toMalStatus(status, type));
    }

    const data = await this.request<{
      data: { node: MalNodeRaw; list_status: MalListStatusRaw }[];
    }>(`/v2/users/@me/${resource}?${params.toString()}`);

    return data.data.map((item) => ({
      media: normalizeMalMedia(item.node, type),
      status: fromMalStatus(item.list_status),
      progress:
        type === 'ANIME'
          ? item.list_status.num_episodes_watched ?? 0
          : item.list_status.num_chapters_read ?? 0,
      progressVolumes: item.list_status.num_volumes_read,
      score: item.list_status.score > 0 ? item.list_status.score * 10 : undefined,
      startedAt: item.list_status.start_date || undefined,
      completedAt: item.list_status.finish_date || undefined,
      repeat:
        type === 'ANIME'
          ? item.list_status.num_times_rewatched
          : item.list_status.num_times_reread,
      notes: item.list_status.comments || undefined,
      updatedAt: item.list_status.updated_at
        ? Date.parse(item.list_status.updated_at)
        : Date.now(),
    }));
  }

  async updateEntry(entry: EntryUpdate): Promise<ListEntry> {
    const malId = stripMalPrefix(entry.mediaId);
    const resource = entry.type === 'ANIME' ? 'anime' : 'manga';
    const body = new URLSearchParams();

    if (entry.status) {
      body.set('status', toMalStatus(entry.status, entry.type));
      if (entry.type === 'ANIME') {
        body.set('is_rewatching', String(entry.status === 'REPEATING'));
      } else {
        body.set('is_rereading', String(entry.status === 'REPEATING'));
      }
    }
    if (entry.progress !== undefined) {
      body.set(
        entry.type === 'ANIME' ? 'num_watched_episodes' : 'num_chapters_read',
        String(entry.progress)
      );
    }
    if (entry.progressVolumes !== undefined && entry.type === 'MANGA') {
      body.set('num_volumes_read', String(entry.progressVolumes));
    }
    if (entry.score !== undefined) {
      body.set('score', String(Math.min(10, Math.max(0, Math.round(entry.score / 10)))));
    }
    if (entry.startedAt !== undefined) body.set('start_date', entry.startedAt);
    if (entry.completedAt !== undefined) body.set('finish_date', entry.completedAt);
    if (entry.repeat !== undefined) {
      body.set(
        entry.type === 'ANIME' ? 'num_times_rewatched' : 'num_times_reread',
        String(entry.repeat)
      );
    }
    if (entry.notes !== undefined) body.set('comments', entry.notes);

    const updated = await this.request<MalListStatusRaw>(
      `/v2/${resource}/${malId}/my_list_status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }
    );

    const media = await this.getMedia(entry.mediaId, entry.type);
    return {
      media,
      status: fromMalStatus(updated),
      progress:
        entry.type === 'ANIME'
          ? updated.num_episodes_watched ?? 0
          : updated.num_chapters_read ?? 0,
      progressVolumes: updated.num_volumes_read,
      score: updated.score > 0 ? updated.score * 10 : undefined,
      startedAt: updated.start_date || undefined,
      completedAt: updated.finish_date || undefined,
      repeat:
        entry.type === 'ANIME' ? updated.num_times_rewatched : updated.num_times_reread,
      notes: updated.comments || undefined,
      updatedAt: updated.updated_at ? Date.parse(updated.updated_at) : Date.now(),
    };
  }

  async deleteEntry(mediaId: string, type: MediaType): Promise<void> {
    const malId = stripMalPrefix(mediaId);
    const resource = type === 'ANIME' ? 'anime' : 'manga';
    await this.request(`/v2/${resource}/${malId}/my_list_status`, {
      method: 'DELETE',
    });
  }

  async search(query: string, filters: SearchFilters): Promise<Page<Media>> {
    const resource = filters.type === 'ANIME' ? 'anime' : 'manga';
    const fields = filters.type === 'ANIME' ? MAL_ANIME_FIELDS : MAL_MANGA_FIELDS;
    const perPage = filters.perPage ?? 24;
    const offset = ((filters.page ?? 1) - 1) * perPage;

    const params = new URLSearchParams({
      q: query || 'a',
      limit: String(perPage),
      offset: String(offset),
      fields,
      nsfw: filters.includeAdult ? 'true' : 'false',
    });

    const data = await this.request<{
      data: { node: MalNodeRaw }[];
      paging?: { next?: string };
    }>(`/v2/${resource}?${params.toString()}`);

    let items = data.data.map((d) => normalizeMalMedia(d.node, filters.type));
    if (filters.genre) {
      const targetGenre = filters.genre.toLowerCase();
      items = items.filter((m) =>
        m.genres.some((g) => g.toLowerCase() === targetGenre)
      );
    }
    if (filters.year) {
      items = items.filter((m) => m.seasonYear === filters.year);
    }
    if (filters.season) {
      items = items.filter((m) => m.season === filters.season);
    }
    if (filters.format) {
      items = items.filter((m) => m.format === filters.format);
    }
    if (filters.status) {
      const normalized = filters.status.toUpperCase();
      items = items.filter((m) => {
        const s = m.status?.toUpperCase() ?? '';
        if (normalized === 'RELEASING') {
          return s === 'CURRENTLY_AIRING' || s === 'CURRENTLY_PUBLISHING' || s === 'RELEASING';
        }
        if (normalized === 'FINISHED') {
          return s === 'FINISHED_AIRING' || s === 'FINISHED';
        }
        if (normalized === 'NOT_YET_RELEASED') {
          return s === 'NOT_YET_AIRED' || s === 'NOT_YET_PUBLISHED' || s === 'NOT_YET_RELEASED';
        }
        return s === normalized;
      });
    }
    if (filters.minScore && filters.minScore > 0) {
      items = items.filter((m) => (m.averageScore ?? 0) >= filters.minScore!);
    }
    if (filters.sort === 'SCORE_DESC') {
      items = [...items].sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0));
    } else if (filters.sort === 'START_DATE_DESC') {
      items = [...items].sort((a, b) => (b.seasonYear ?? 0) - (a.seasonYear ?? 0));
    }

    return {
      items,
      hasNextPage: Boolean(data.paging?.next),
    };
  }

  async getMedia(id: string, type: MediaType): Promise<Media> {
    if (id.startsWith('al:')) {
      return new AniListProvider().getMedia(id, type);
    }
    const malId = stripMalPrefix(id);
    const resource = type === 'ANIME' ? 'anime' : 'manga';
    const fields = type === 'ANIME' ? MAL_ANIME_FIELDS : MAL_MANGA_FIELDS;
    const [node, enriched] = await Promise.all([
      this.request<MalNodeRaw>(`/v2/${resource}/${malId}?fields=${fields}`),
      fetchAniListDetailsByMalId(Number(malId), type),
    ]);
    const base = normalizeMalMedia(node, type);
    if (!enriched) return base;
    return {
      ...enriched,
      id: base.id,
      malId: base.malId,
      title: {
        romaji: base.title.romaji || enriched.title.romaji,
        english: base.title.english || enriched.title.english,
        native: base.title.native || enriched.title.native,
      },
      coverUrl: base.coverUrl || enriched.coverUrl,
      synopsis: base.synopsis || enriched.synopsis,
    };
  }

  async getPopular(
    type: MediaType,
    kind: PopularKind,
    page = 1
  ): Promise<Page<Media>> {
    const resource = type === 'ANIME' ? 'anime' : 'manga';
    const fields = type === 'ANIME' ? MAL_ANIME_FIELDS : MAL_MANGA_FIELDS;
    const perPage = 24;
    const offset = (page - 1) * perPage;
    const rankingType =
      kind === 'toprated'
        ? 'all'
        : kind === 'upcoming' && type === 'ANIME'
          ? 'upcoming'
          : kind === 'trending' && type === 'ANIME'
            ? 'airing'
            : 'bypopularity';

    const data = await this.request<{
      data: { node: MalNodeRaw }[];
      paging?: { next?: string };
    }>(
      `/v2/${resource}/ranking?ranking_type=${rankingType}&limit=${perPage}&offset=${offset}&fields=${fields}`
    );

    return {
      items: data.data.map((d) => normalizeMalMedia(d.node, type)),
      hasNextPage: Boolean(data.paging?.next),
    };
  }
}
