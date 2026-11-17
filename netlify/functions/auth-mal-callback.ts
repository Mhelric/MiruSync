import type { Context } from '@netlify/functions';
import { buildCookie, getAppOrigin, parseCookies } from './_lib/cookies';
import { mintSupabaseJwt, signJwt, verifyJwt } from './_lib/jwt';
import { upsertSupabaseUser } from './_lib/supabase';

const STATE_COOKIE = 'mirusync_oauth_state';
const SESSION_COOKIE = 'mirusync_session';

export default async function handler(req: Request, _context: Context) {
  const clientId = process.env.MAL_CLIENT_ID;
  const clientSecret = process.env.MAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return Response.json({ error: 'MAL OAuth credentials not configured' }, { status: 500 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const origin = getAppOrigin(req);

  if (error || !code || !state) {
    return Response.redirect(`${origin}/?auth_error=${encodeURIComponent(error || 'missing_code')}`, 302);
  }

  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionSecret = process.env.SESSION_SECRET || 'dev-insecure-secret';
  const statePayload = cookies[STATE_COOKIE]
    ? verifyJwt<{ state: string; codeVerifier: string; platform: 'web' | 'mobile' }>(
        cookies[STATE_COOKIE],
        sessionSecret
      )
    : null;

  if (!statePayload || statePayload.state !== state) {
    return Response.redirect(`${origin}/?auth_error=invalid_state`, 302);
  }

  const redirectUri = `${origin}/api/auth-mal-callback`;
  const tokenRes = await fetch('https://myanimelist.net/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: statePayload.codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    return Response.redirect(`${origin}/?auth_error=token_exchange_failed`, 302);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const meRes = await fetch('https://api.myanimelist.net/v2/users/@me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!meRes.ok) {
    return Response.redirect(`${origin}/?auth_error=profile_fetch_failed`, 302);
  }

  const me = (await meRes.json()) as {
    id: number;
    name: string;
    picture?: string;
  };

  const userId = `mal:${me.id}`;
  await upsertSupabaseUser({
    id: userId,
    provider: 'mal',
    provider_user_id: String(me.id),
    username: me.name,
    avatar_url: me.picture,
    score_format: 'POINT_10',
  });

  const supabaseJwt = process.env.SUPABASE_JWT_SECRET ? mintSupabaseJwt(userId) : '';
  const appUser = {
    provider: 'mal' as const,
    id: userId,
    name: me.name,
    avatarUrl: me.picture,
    scoreFormat: 'POINT_10' as const,
  };

  const sessionPayload = {
    provider: 'mal' as const,
    user: appUser,
    providerAccessToken: tokens.access_token,
    providerRefreshToken: tokens.refresh_token,
    providerExpiresAt: Date.now() + tokens.expires_in * 1000,
    supabaseJwt,
  };

  const signedSession = signJwt(sessionPayload, sessionSecret, 60 * 60 * 24 * 7);

  if (statePayload.platform === 'mobile') {
    const mobileRedirect = `mirusync://auth/callback?session=${encodeURIComponent(signedSession)}`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: mobileRedirect,
        'Set-Cookie': buildCookie(STATE_COOKIE, '', { maxAge: 0 }),
      },
    });
  }

  const headers = new Headers();
  headers.set('Location', `${origin}/auth/callback`);
  headers.append('Set-Cookie', buildCookie(STATE_COOKIE, '', { maxAge: 0 }));
  headers.append('Set-Cookie', buildCookie(SESSION_COOKIE, signedSession, { maxAge: 60 * 60 * 24 * 7 }));
  return new Response(null, { status: 302, headers });
}
