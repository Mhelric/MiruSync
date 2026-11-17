import type { Context } from '@netlify/functions';
import { buildCookie, getAppOrigin } from './_lib/cookies';
import { generateRandomState, signJwt } from './_lib/jwt';

const STATE_COOKIE = 'mirusync_oauth_state';

export default async function handler(req: Request, _context: Context) {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: 'MAL_CLIENT_ID is not configured' }, { status: 500 });
  }

  const reqUrl = new URL(req.url);
  const platform = reqUrl.searchParams.get('platform') === 'mobile' ? 'mobile' : 'web';
  const origin = getAppOrigin(req);
  const redirectUri = `${origin}/api/auth-mal-callback`;

  const state = generateRandomState(24);
  // MAL API v2 requires PKCE with code_challenge_method=plain (43-128 chars)
  const codeVerifier = generateRandomState(48);

  const sessionSecret = process.env.SESSION_SECRET || 'dev-insecure-secret';
  const signedState = signJwt({ state, codeVerifier, platform }, sessionSecret, 600);

  const authUrl = new URL('https://myanimelist.net/v1/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('code_challenge', codeVerifier);
  authUrl.searchParams.set('code_challenge_method', 'plain');

  const headers = new Headers();
  headers.set('Location', authUrl.toString());
  headers.append('Set-Cookie', buildCookie(STATE_COOKIE, signedState, { maxAge: 600 }));

  return new Response(null, { status: 302, headers });
}
