import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedJwt: string | undefined;

export function getSupabaseClient(
  url: string,
  anonKey: string,
  supabaseJwt?: string
): SupabaseClient | null {
  if (!url || !anonKey) return null;

  if (!cachedClient || cachedJwt !== supabaseJwt) {
    cachedJwt = supabaseJwt;
    cachedClient = createClient(url, anonKey, {
      global: {
        headers: supabaseJwt ? { Authorization: `Bearer ${supabaseJwt}` } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    if (supabaseJwt) {
      cachedClient.realtime.setAuth(supabaseJwt);
    }
  }

  return cachedClient;
}
