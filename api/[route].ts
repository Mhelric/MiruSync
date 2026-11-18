import type { Context } from '@netlify/functions';
import accountDelete from '../netlify/functions/account-delete';
import appVersion from '../netlify/functions/app-version';
import authAlCallback from '../netlify/functions/auth-al-callback';
import authAlStart from '../netlify/functions/auth-al-start';
import authMalCallback from '../netlify/functions/auth-mal-callback';
import authMalStart from '../netlify/functions/auth-mal-start';
import authMobileExchange from '../netlify/functions/auth-mobile-exchange';
import authSession from '../netlify/functions/auth-session';
import cronNotify from '../netlify/functions/cron-notify';
import health from '../netlify/functions/health';
import malProxy from '../netlify/functions/mal-proxy';
import mangadexChapters from '../netlify/functions/mangadex-chapters';
import news from '../netlify/functions/news';
import schedule from '../netlify/functions/schedule';
import userSync from '../netlify/functions/user-sync';

type WebHandler = (req: Request, context: Context) => Promise<Response>;

const ROUTES: Record<string, WebHandler> = {
  'account-delete': accountDelete,
  'app-version': appVersion,
  'auth-al-callback': authAlCallback,
  'auth-al-start': authAlStart,
  'auth-mal-callback': authMalCallback,
  'auth-mal-start': authMalStart,
  'auth-mobile-exchange': authMobileExchange,
  'auth-session': authSession,
  health,
  'mal-proxy': malProxy,
  'mangadex-chapters': mangadexChapters,
  news,
  schedule,
  'user-sync': userSync,
  'cron-notify': async () => {
    await cronNotify();
    return Response.json({ ok: true });
  },
};

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function dispatch(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const url = new URL(req.url);
  const routeFromQuery = url.searchParams.get('route');
  const pathSegment = url.pathname.replace(/^\/api\/?/, '').split('/')[0];
  const key = routeFromQuery || pathSegment;
  const handler = key ? ROUTES[key] : undefined;

  if (!handler) {
    return Response.json(
      { error: `Unknown API route: ${key || '/'}` },
      { status: 404, headers: corsHeaders(req) }
    );
  }

  const res = await handler(req, {} as Context);
  const headers = new Headers(res.headers);
  const cors = corsHeaders(req);
  for (const [k, v] of Object.entries(cors)) {
    if (!headers.has(k)) {
      headers.set(k, v);
    }
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
export const OPTIONS = dispatch;

export default {
  fetch: dispatch,
};
