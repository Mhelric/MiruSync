import type { Context } from '@netlify/functions';
import { buildCookie } from './_lib/cookies';
import {
  resolveAuthenticatedUserId,
  SESSION_COOKIE,
  supabaseServiceFetch,
} from './_lib/supabase';

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'DELETE') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const userId = resolveAuthenticatedUserId(req);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await supabaseServiceFetch(
    `users?id=eq.${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );
  if (res && !res.ok) {
    return Response.json({ error: 'Failed to delete cloud data' }, { status: 500 });
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
