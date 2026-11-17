import { create } from 'zustand';
import type { AppUser, ProviderId } from '../providers/types';

export interface AuthSession {
  provider: ProviderId;
  user: AppUser;
  supabaseJwt: string;
  providerAccessToken?: string;
}

interface AuthState {
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  hydrateFromWeb: (apiBase?: string) => Promise<void>;
  logoutWeb: (apiBase?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  error: null,

  setSession: (session) => set({ session, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  hydrateFromWeb: async (apiBase = '') => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${apiBase}/api/auth-session`, {
        credentials: 'include',
      });
      if (!res.ok) {
        set({ session: null, isLoading: false });
        return;
      }
      const data = (await res.json()) as
        | { authenticated: false }
        | {
            authenticated: true;
            provider: ProviderId;
            user: AppUser;
            supabaseJwt: string;
            providerAccessToken?: string;
          };

      if (!data.authenticated) {
        set({ session: null, isLoading: false });
        return;
      }

      set({
        session: {
          provider: data.provider,
          user: data.user,
          supabaseJwt: data.supabaseJwt,
          providerAccessToken: data.providerAccessToken,
        },
        isLoading: false,
      });
    } catch (err) {
      set({
        session: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load session',
      });
    }
  },

  logoutWeb: async (apiBase = '') => {
    try {
      await fetch(`${apiBase}/api/auth-session`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } finally {
      set({ session: null, isLoading: false, error: null });
    }
  },
}));
