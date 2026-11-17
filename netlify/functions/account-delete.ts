import type { Context } from '@netlify/functions';
import { buildCookie, parseCookies } from './_lib/cookies';
import { verifyJwt } from './_lib/jwt';

const SESSION_COOKIE = 'mirusync_session';

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'DELETE') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionSecret = process.env.SESSION_SECRET || 'dev-insecure-secret';
  const cookieSession = cookies[SESSION_COOKIE]
    ? verifyJwt<{ user: { id: string } }>(cookies[SESSION_COOKIE], sessionSecret)
    : null;

  let userId = cookieSession?.user?.id;

  // Allow mobile clients to authenticate with their Supabase JWT
  if (!userId) {
    const authHeader = req.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (bearer && jwtSecret) {
      const payload = verifyJwt<{ sub?: string }>(bearer, jwtSecret);
      userId = payload?.sub;
    }
  }

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );
    if (!res.ok) {
      return Response.json({ error: 'Failed to delete cloud data' }, { status: 500 });
    }
  }

  return Response.json(
    { ok: true, deletedUserId: userId },
    {
      headers: {
        'Set-Cookie': buildCookie(SESSION_COOKIE, '', { maxAge: 0 }),
      },
    }
  );
}
