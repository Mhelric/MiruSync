import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import { createProvider } from '../providers';
import type {
  EntryUpdate,
  ListEntry,
  ListStatus,
  MediaType,
  UserProfileDetails,
} from '../providers/types';
import { db } from '../storage/db';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return online;
}

export function useProvider(apiBase = '') {
  const session = useAuthStore((s) => s.session);
  return useMemo(() => {
    if (!session) return null;
    return createProvider(session, apiBase);
  }, [session, apiBase]);
}

export function useMediaList(type: MediaType, status?: ListStatus, apiBase = '') {
  const session = useAuthStore((s) => s.session);
  const provider = useProvider(apiBase);
  const userId = session?.user.id ?? '';
  const cacheKey = `${userId}:${type}`;

  return useQuery<ListEntry[]>({
    queryKey: ['mediaList', userId, type, status ?? 'ALL'],
    enabled: Boolean(provider && userId),
    queryFn: async () => {
      if (!provider) return [];
      try {
        const entries = await provider.getList(type);
        await db.listCache.put({
          key: cacheKey,
          userId,
          type,
          entries,
          updatedAt: Date.now(),
        });
        return status ? entries.filter((e) => e.status === status) : entries;
      } catch (err) {
        const cached = await db.listCache.get(cacheKey);
        if (cached) {
          return status
            ? cached.entries.filter((e) => e.status === status)
            : cached.entries;
        }
        throw err;
      }
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useMediaDetail(id: string | undefined, type: MediaType, apiBase = '') {
  const provider = useProvider(apiBase);

  return useQuery({
    queryKey: ['mediaDetail', type, id],
    enabled: Boolean(provider && id),
    queryFn: async () => {
      if (!provider || !id) throw new Error('Missing provider or media id');
      return provider.getMedia(id, type);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useProfileDetails(apiBase = '') {
  const session = useAuthStore((s) => s.session);
  const provider = useProvider(apiBase);
  const userId = session?.user.id ?? '';

  return useQuery<UserProfileDetails>({
    queryKey: ['profileDetails', userId],
    enabled: Boolean(provider && userId),
    queryFn: async () => {
      if (!provider) {
        return {
          activityHistory: [],
          favorites: { anime: [], manga: [], characters: [] },
          recentActivities: [],
        };
      }
      return provider.getProfileDetails();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateEntry(apiBase = '') {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const provider = useProvider(apiBase);
  const userId = session?.user.id ?? '';

  return useMutation({
    mutationFn: async (update: EntryUpdate) => {
      if (!provider) throw new Error('Not authenticated');
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await db.pendingEdits.add({
          userId,
          update,
          createdAt: Date.now(),
        });
        return null;
      }
      try {
        return await provider.updateEntry(update);
      } catch {
        // Queue for replay on reconnect if network/API failed
        await db.pendingEdits.add({
          userId,
          update,
          createdAt: Date.now(),
        });
        return null;
      }
    },
    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey: ['mediaList', userId, update.type] });
      const previous = queryClient.getQueriesData<ListEntry[]>({
        queryKey: ['mediaList', userId, update.type],
      });

      queryClient.setQueriesData<ListEntry[]>(
        { queryKey: ['mediaList', userId, update.type] },
        (old) => {
          if (!old) return old;
          return old.map((entry) => {
            if (entry.media.id !== update.mediaId) return entry;
            return {
              ...entry,
              status: update.status ?? entry.status,
              progress: update.progress ?? entry.progress,
              progressVolumes: update.progressVolumes ?? entry.progressVolumes,
              score: update.score ?? entry.score,
              startedAt: update.startedAt ?? entry.startedAt,
              completedAt: update.completedAt ?? entry.completedAt,
              repeat: update.repeat ?? entry.repeat,
              notes: update.notes ?? entry.notes,
              updatedAt: Date.now(),
            };
          });
        }
      );

      return { previous };
    },
    onError: (_err, _update, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: (_data, _err, update) => {
      void queryClient.invalidateQueries({
        queryKey: ['mediaList', userId, update.type],
      });
    },
  });
}

export function useDeleteEntry(apiBase = '') {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const provider = useProvider(apiBase);
  const userId = session?.user.id ?? '';

  return useMutation({
    mutationFn: async ({ mediaId, type }: { mediaId: string; type: MediaType }) => {
      if (!provider) throw new Error('Not authenticated');
      await provider.deleteEntry(mediaId, type);
    },
    onSuccess: (_data, { type }) => {
      void queryClient.invalidateQueries({ queryKey: ['mediaList', userId, type] });
    },
  });
}

export function usePendingEditsSync(apiBase = '') {
  const online = useOnlineStatus();
  const session = useAuthStore((s) => s.session);
  const provider = useProvider(apiBase);
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    let cancelled = false;

    async function syncPending() {
      const rows = await db.pendingEdits.where('userId').equals(userId!).toArray();
      if (!cancelled) setPendingCount(rows.length);

      if (!online || !provider || rows.length === 0) return;

      for (const row of rows) {
        try {
          await provider.updateEntry(row.update);
          if (row.id !== undefined) {
            await db.pendingEdits.delete(row.id);
          }
        } catch {
          break;
        }
      }

      const remaining = await db.pendingEdits.where('userId').equals(userId!).count();
      if (!cancelled) {
        setPendingCount(remaining);
        void queryClient.invalidateQueries({ queryKey: ['mediaList', userId] });
      }
    }

    void syncPending();
    return () => {
      cancelled = true;
    };
  }, [online, provider, session?.user.id, queryClient]);

  return pendingCount;
}
