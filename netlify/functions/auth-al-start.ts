import type { Context } from '@netlify/functions';
import { buildCookie, getAppOrigin } from './_lib/cookies';
import { generateRandomState, signJwt } from './_lib/jwt';

const STATE_COOKIE = 'mirusync_oauth_state';

export default async function handler(req: Request, _context: Context) {
  const clientId = process.env.AL_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: 'AL_CLIENT_ID is not configured' }, { status: 500 });
  }

  const reqUrl = new URL(req.url);
  const platform = reqUrl.searchParams.get('platform') === 'mobile' ? 'mobile' : 'web';
  const origin = getAppOrigin(req);
  const redirectUri = `${origin}/api/auth-al-callback`;

  const state = generateRandomState(24);
  const sessionSecret = process.env.SESSION_SECRET || 'dev-insecure-secret';
  const signedState = signJwt({ state, platform }, sessionSecret, 600);

  const authUrl = new URL('https://anilist.co/api/v2/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  const headers = new Headers();
  headers.set('Location', authUrl.toString());
  headers.append('Set-Cookie', buildCookie(STATE_COOKIE, signedState, { maxAge: 600 }));

  return new Response(null, { status: 302, headers });
}
