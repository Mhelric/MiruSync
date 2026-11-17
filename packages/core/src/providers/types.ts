export type ProviderId = 'mal' | 'anilist';
export type MediaType = 'ANIME' | 'MANGA';
export type ListStatus =
  | 'CURRENT'
  | 'PLANNING'
  | 'COMPLETED'
  | 'PAUSED'
  | 'DROPPED'
  | 'REPEATING';

export type ScoreFormat =
  | 'POINT_100'
  | 'POINT_10'
  | 'POINT_10_DECIMAL'
  | 'POINT_5'
  | 'POINT_3';

export interface Media {
  id: string;
  alId?: number;
  malId?: number;
  type: MediaType;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  coverUrl?: string;
  bannerUrl?: string;
  synopsis?: string;
  genres: string[];
  format?: string;
  status?: string;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  averageScore?: number;
  season?: string;
  seasonYear?: number;
  nextAiring?: {
    episode: number;
    airingAt: number;
  };
  isAdult: boolean;
  streamingLinks?: { site: string; url: string }[];
}

export interface ListEntry {
  media: Media;
  status: ListStatus;
  progress: number;
  progressVolumes?: number;
  score?: number;
  startedAt?: string;
  completedAt?: string;
  repeat?: number;
  notes?: string;
  updatedAt: number;
}

export interface EntryUpdate {
  mediaId: string;
  type: MediaType;
  status?: ListStatus;
  progress?: number;
  progressVolumes?: number;
  score?: number;
  startedAt?: string;
  completedAt?: string;
  repeat?: number;
  notes?: string;
}

export interface AppUser {
  provider: ProviderId;
  id: string;
  name: string;
  avatarUrl?: string;
  scoreFormat: ScoreFormat;
}

export interface SearchFilters {
  type: MediaType;
  genre?: string;
  year?: number;
  season?: string;
  format?: string;
  status?: string;
  includeAdult?: boolean;
  page?: number;
  perPage?: number;
}

export interface Page<T> {
  items: T[];
  hasNextPage: boolean;
  total?: number;
}

export interface MediaProvider {
  id: ProviderId;
  getCurrentUser(): Promise<AppUser>;
  getList(type: MediaType, status?: ListStatus): Promise<ListEntry[]>;
  updateEntry(entry: EntryUpdate): Promise<ListEntry>;
  deleteEntry(mediaId: string, type: MediaType): Promise<void>;
  search(query: string, filters: SearchFilters): Promise<Page<Media>>;
  getMedia(id: string, type: MediaType): Promise<Media>;
  getPopular(
    type: MediaType,
    kind: 'trending' | 'season' | 'alltime',
    page?: number
  ): Promise<Page<Media>>;
}
