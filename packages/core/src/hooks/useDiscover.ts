import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Media, MediaType, Page, SearchFilters } from '../providers/types';
import { useProvider } from './useList';

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
    enabled: Boolean(provider && (debouncedQuery.length > 0 || filters.genre || filters.year || filters.season || filters.format || filters.status)),
    queryFn: async () => {
      if (!provider) return { items: [], hasNextPage: false };
      return provider.search(debouncedQuery, filters);
    },
    staleTime: 1000 * 60 * 3,
  });
}

export function usePopularMedia(
  type: MediaType,
  kind: 'trending' | 'season' | 'alltime',
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
