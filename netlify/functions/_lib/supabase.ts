import { parseCookies } from './cookies';
import { verifyJwt } from './jwt';

export const SESSION_COOKIE = 'mirusync_session';

export interface UpsertUserInput {
  id: string;
  provider: 'mal' | 'anilist';
  provider_user_id: string;
  username: string;
  avatar_url?: string;
  score_format: string;
}

export function resolveAuthenticatedUserId(req: Request): string | null {
  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionSecret = process.env.SESSION_SECRET || 'dev-insecure-secret';
  const cookieSession = cookies[SESSION_COOKIE]
    ? verifyJwt<{ user?: { id?: string } }>(cookies[SESSION_COOKIE], sessionSecret)
    : null;

  if (cookieSession?.user?.id) {
    return cookieSession.user.id;
  }

  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!bearer) return null;

  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (jwtSecret) {
    const payload = verifyJwt<{ sub?: string }>(bearer, jwtSecret);
    if (payload?.sub) return payload.sub;
  }

  const sessionToken = verifyJwt<{ sub?: string; user?: { id?: string } }>(
    bearer,
    sessionSecret
  );
  return sessionToken?.sub ?? sessionToken?.user?.id ?? null;
}

export async function supabaseServiceFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const headers = new Headers(init.headers);
  headers.set('apikey', serviceKey);
  headers.set('Authorization', `Bearer ${serviceKey}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers,
  });
}

export async function upsertSupabaseUser(input: UpsertUserInput): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    // Allow local OAuth testing even before Supabase env vars are added
    return;
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates',
  };

  const userRes = await fetch(`${supabaseUrl}/rest/v1/users?on_conflict=id`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...input,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!userRes.ok) {
    const text = await userRes.text();
    throw new Error(`Supabase user upsert failed: ${userRes.status} ${text}`);
  }

  const settingsRes = await fetch(
    `${supabaseUrl}/rest/v1/user_settings?on_conflict=user_id`,
    {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({
        user_id: input.id,
      }),
    }
  );

  if (!settingsRes.ok) {
    const text = await settingsRes.text();
    throw new Error(`Supabase settings init failed: ${settingsRes.status} ${text}`);
  }
}
