import type { Context } from '@netlify/functions';
import { buildCookie, parseCookies } from './_lib/cookies';
import { mintSupabaseJwt, signJwt, verifyJwt } from './_lib/jwt';

const SESSION_COOKIE = 'mirusync_session';

interface StoredSession {
  provider: 'mal' | 'anilist';
  user: {
    provider: 'mal' | 'anilist';
    id: string;
    name: string;
    avatarUrl?: string;
    scoreFormat: string;
  };
  providerAccessToken: string;
  providerRefreshToken?: string;
  providerExpiresAt?: number;
  supabaseJwt: string;
}

async function refreshMalTokenIfNeeded(session: StoredSession): Promise<StoredSession | null> {
  if (
    session.provider !== 'mal' ||
    !session.providerRefreshToken ||
    !session.providerExpiresAt ||
    session.providerExpiresAt - Date.now() > 5 * 60 * 1000
  ) {
    return session;
  }

  const clientId = process.env.MAL_CLIENT_ID;
  const clientSecret = process.env.MAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://myanimelist.net/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: session.providerRefreshToken,
    }),
  });

  if (!res.ok) return null;
  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    ...session,
    providerAccessToken: tokens.access_token,
    providerRefreshToken: tokens.refresh_token,
    providerExpiresAt: Date.now() + tokens.expires_in * 1000,
    supabaseJwt: process.env.SUPABASE_JWT_SECRET
      ? mintSupabaseJwt(session.user.id)
      : session.supabaseJwt,
  };
}

export default async function handler(req: Request, _context: Context) {
  if (req.method === 'DELETE') {
    return Response.json(
      { ok: true },
      {
        headers: {
          'Set-Cookie': buildCookie(SESSION_COOKIE, '', { maxAge: 0 }),
        },
      }
    );
  }

  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const cookies = parseCookies(req.headers.get('cookie'));
  const rawCookie = cookies[SESSION_COOKIE];
  if (!rawCookie) {
    return Response.json({ authenticated: false }, { status: 200 });
  }

  const sessionSecret = process.env.SESSION_SECRET || 'dev-insecure-secret';
  const parsed = verifyJwt<StoredSession>(rawCookie, sessionSecret);
  if (!parsed) {
    return Response.json(
      { authenticated: false },
      {
        status: 200,
        headers: { 'Set-Cookie': buildCookie(SESSION_COOKIE, '', { maxAge: 0 }) },
      }
    );
  }

  const refreshed = await refreshMalTokenIfNeeded(parsed);
  if (!refreshed) {
    return Response.json(
      { authenticated: false, reason: 'refresh_failed' },
      {
        status: 200,
        headers: { 'Set-Cookie': buildCookie(SESSION_COOKIE, '', { maxAge: 0 }) },
      }
    );
  }

  const headers = new Headers();
  if (refreshed !== parsed) {
    const newCookie = signJwt(refreshed as unknown as Record<string, unknown>, sessionSecret, 60 * 60 * 24 * 7);
    headers.set('Set-Cookie', buildCookie(SESSION_COOKIE, newCookie, { maxAge: 60 * 60 * 24 * 7 }));
  }

  return Response.json(
    {
      authenticated: true,
      provider: refreshed.provider,
      user: refreshed.user,
      supabaseJwt: refreshed.supabaseJwt,
      // AniList GraphQL can be called directly from the browser; MAL uses /api/mal-proxy
      providerAccessToken:
        refreshed.provider === 'anilist' ? refreshed.providerAccessToken : undefined,
    },
    { headers }
  );
}
