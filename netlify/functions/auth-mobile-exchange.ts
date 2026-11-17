import type { Context } from '@netlify/functions';
import { verifyJwt } from './_lib/jwt';

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

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body: { session?: string } = {};
  try {
    body = (await req.json()) as { session?: string };
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.session) {
    return Response.json({ error: 'Missing session token' }, { status: 400 });
  }

  const sessionSecret = process.env.SESSION_SECRET || 'dev-insecure-secret';
  const parsed = verifyJwt<StoredSession>(body.session, sessionSecret);
  if (!parsed) {
    return Response.json({ error: 'Invalid or expired session token' }, { status: 401 });
  }

  return Response.json({
    provider: parsed.provider,
    user: parsed.user,
    supabaseJwt: parsed.supabaseJwt,
    providerAccessToken: parsed.providerAccessToken,
  });
}
