export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      result[key] = decodeURIComponent(val);
    }
  }
  return result;
}

export function buildCookie(
  name: string,
  value: string,
  options: { maxAge?: number; path?: string; httpOnly?: boolean } = {}
): string {
  const isProd = process.env.CONTEXT === 'production' || process.env.NODE_ENV === 'production';
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? '/'}`,
    'SameSite=Lax',
  ];
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (isProd) parts.push('Secure');
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  return parts.join('; ');
}

export function getAppOrigin(req: Request): string {
  try {
    const url = new URL(req.url);
    if (url.origin && url.origin !== 'null') {
      return url.origin.replace(/\/$/, '');
    }
  } catch {
    // Fall back to environment variables if req.url is not a full URL
  }
  const envUrl = process.env.URL || process.env.VITE_APP_URL;
  return envUrl ? envUrl.replace(/\/$/, '') : 'http://localhost:8888';
}
