import type { Context } from '@netlify/functions';

export default async function handler(_req: Request, _context: Context) {
  return Response.json({
    ok: true,
    service: 'mirusync-functions',
    timestamp: new Date().toISOString(),
  });
}
