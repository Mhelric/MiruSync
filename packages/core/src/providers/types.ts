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

export interface MediaTag {
  name: string;
  rank?: number;
  isSpoiler?: boolean;
}

export interface MediaRanking {
  rank: number;
  type: 'RATED' | 'POPULAR';
  year?: number;
  allTime?: boolean;
  context: string;
}

export interface MediaRelation {
  relationType: string;
  id: string;
  alId?: number;
  malId?: number;
  type: MediaType;
  title: { romaji?: string; english?: string; native?: string };
  coverUrl?: string;
  format?: string;
  status?: string;
}

export interface MediaCharacter {
  id: number;
  name: string;
  imageUrl?: string;
  role?: string;
  voiceActor?: {
    id: number;
    name: string;
    imageUrl?: string;
  };
}

export interface MediaRecommendation {
  id: string;
  alId?: number;
  malId?: number;
  type: MediaType;
  title: { romaji?: string; english?: string; native?: string };
  coverUrl?: string;
  averageScore?: number;
}

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
  trailer?: { id: string; site: string };
  studios?: string[];
  producers?: string[];
  tags?: MediaTag[];
  rankings?: MediaRanking[];
  relations?: MediaRelation[];
  characters?: MediaCharacter[];
  recommendations?: MediaRecommendation[];
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

export type PopularKind = 'trending' | 'season' | 'upcoming' | 'alltime' | 'toprated';
export type SearchSort = 'POPULARITY_DESC' | 'SCORE_DESC' | 'START_DATE_DESC';

export interface SearchFilters {
  type: MediaType;
  genre?: string;
  year?: number;
  season?: string;
  format?: string;
  status?: string;
  minScore?: number;
  sort?: SearchSort;
  includeAdult?: boolean;
  page?: number;
  perPage?: number;
}

export interface Page<T> {
  items: T[];
  hasNextPage: boolean;
  total?: number;
}

export interface ProfileActivityPoint {
  date: string; // 'YYYY-MM-DD'
  timestamp: number; // unix seconds
  amount: number;
  level: number; // 0..4
}

export interface ProfileFavoriteItem {
  id: string;
  kind: 'ANIME' | 'MANGA' | 'CHARACTER';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  mediaType?: MediaType;
  score?: number;
}

export interface ProfileActivityEvent {
  id: string;
  status: string;
  progress?: string;
  createdAt: number; // epoch ms
  media: {
    id: string;
    type: MediaType;
    title: { romaji?: string; english?: string; native?: string };
    coverUrl?: string;
  };
}

export interface UserProfileDetails {
  bannerUrl?: string;
  about?: string;
  activityHistory: ProfileActivityPoint[];
  favorites: {
    anime: ProfileFavoriteItem[];
    manga: ProfileFavoriteItem[];
    characters: ProfileFavoriteItem[];
  };
  recentActivities: ProfileActivityEvent[];
}

export interface MediaProvider {
  id: ProviderId;
  getCurrentUser(): Promise<AppUser>;
  getProfileDetails(): Promise<UserProfileDetails>;
  getList(type: MediaType, status?: ListStatus): Promise<ListEntry[]>;
  updateEntry(entry: EntryUpdate): Promise<ListEntry>;
  deleteEntry(mediaId: string, type: MediaType): Promise<void>;
  search(query: string, filters: SearchFilters): Promise<Page<Media>>;
  getMedia(id: string, type: MediaType): Promise<Media>;
  getPopular(
    type: MediaType,
    kind: PopularKind,
    page?: number
  ): Promise<Page<Media>>;
}
