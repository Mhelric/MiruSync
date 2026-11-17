import type { Context } from '@netlify/functions';
import { parseCookies } from './_lib/cookies';
import { verifyJwt } from './_lib/jwt';

const SESSION_COOKIE = 'mirusync_session';

const ALLOWED_PATH_PREFIXES = [
  '/v2/users/@me',
  '/v2/anime',
  '/v2/manga',
];

export default async function handler(req: Request, _context: Context) {
  const url = new URL(req.url);
  const targetPath = url.searchParams.get('path');
  if (!targetPath || !targetPath.startsWith('/v2/')) {
    return Response.json({ error: 'Invalid MAL API path' }, { status: 400 });
  }

  const isAllowed = ALLOWED_PATH_PREFIXES.some((prefix) => targetPath.startsWith(prefix));
  if (!isAllowed) {
    return Response.json({ error: 'Path not allow-listed' }, { status: 403 });
  }

  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionSecret = process.env.SESSION_SECRET || 'dev-insecure-secret';
  const session = cookies[SESSION_COOKIE]
    ? verifyJwt<{ provider: string; providerAccessToken: string }>(
        cookies[SESSION_COOKIE],
        sessionSecret
      )
    : null;

  const bearerOverride = req.headers.get('x-mal-token');
  const accessToken = session?.provider === 'mal' ? session.providerAccessToken : bearerOverride;

  if (!accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const malUrl = `https://api.myanimelist.net${targetPath}`;
  const init: RequestInit = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': req.headers.get('content-type') || 'application/x-www-form-urlencoded',
    },
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  const malRes = await fetch(malUrl, init);
  const body = await malRes.text();

  return new Response(body, {
    status: malRes.status,
    headers: {
      'Content-Type': malRes.headers.get('content-type') || 'application/json',
    },
  });
}
