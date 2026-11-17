import type { Context } from '@netlify/functions';
import { buildCookie, getAppOrigin, parseCookies } from './_lib/cookies';
import { mintSupabaseJwt, signJwt, verifyJwt } from './_lib/jwt';
import { upsertSupabaseUser } from './_lib/supabase';

const STATE_COOKIE = 'mirusync_oauth_state';
const SESSION_COOKIE = 'mirusync_session';

const VIEWER_QUERY = `
  query {
    Viewer {
      id
      name
      avatar { large }
      mediaListOptions { scoreFormat }
    }
  }
`;

export default async function handler(req: Request, _context: Context) {
  const clientId = process.env.AL_CLIENT_ID;
  const clientSecret = process.env.AL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return Response.json({ error: 'AniList OAuth credentials not configured' }, { status: 500 });
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
    ? verifyJwt<{ state: string; platform: 'web' | 'mobile' }>(cookies[STATE_COOKIE], sessionSecret)
    : null;

  if (!statePayload || statePayload.state !== state) {
    return Response.redirect(`${origin}/?auth_error=invalid_state`, 302);
  }

  const redirectUri = `${origin}/api/auth-al-callback`;
  const tokenRes = await fetch('https://anilist.co/api/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return Response.redirect(`${origin}/?auth_error=token_exchange_failed`, 302);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const viewerRes = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.access_token}`,
    },
    body: JSON.stringify({ query: VIEWER_QUERY }),
  });

  if (!viewerRes.ok) {
    return Response.redirect(`${origin}/?auth_error=profile_fetch_failed`, 302);
  }

  const viewerJson = (await viewerRes.json()) as {
    data?: {
      Viewer?: {
        id: number;
        name: string;
        avatar?: { large?: string };
        mediaListOptions?: { scoreFormat?: string };
      };
    };
  };

  const viewer = viewerJson.data?.Viewer;
  if (!viewer) {
    return Response.redirect(`${origin}/?auth_error=profile_missing`, 302);
  }

  const userId = `al:${viewer.id}`;
  const scoreFormat = viewer.mediaListOptions?.scoreFormat || 'POINT_10';

  await upsertSupabaseUser({
    id: userId,
    provider: 'anilist',
    provider_user_id: String(viewer.id),
    username: viewer.name,
    avatar_url: viewer.avatar?.large,
    score_format: scoreFormat,
  });

  const supabaseJwt = process.env.SUPABASE_JWT_SECRET ? mintSupabaseJwt(userId) : '';
  const appUser = {
    provider: 'anilist' as const,
    id: userId,
    name: viewer.name,
    avatarUrl: viewer.avatar?.large,
    scoreFormat,
  };

  const sessionPayload = {
    provider: 'anilist' as const,
    user: appUser,
    providerAccessToken: tokens.access_token,
    providerExpiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
    supabaseJwt,
  };

  const signedSession = signJwt(sessionPayload, sessionSecret, 60 * 60 * 24 * 30);

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
  headers.append('Set-Cookie', buildCookie(SESSION_COOKIE, signedSession, { maxAge: 60 * 60 * 24 * 30 }));
  return new Response(null, { status: 302, headers });
}
