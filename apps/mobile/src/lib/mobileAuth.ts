import { Browser } from '@capacitor/browser';
import type { AuthSession } from '@mirusync/core';

const MOBILE_SESSION_KEY = 'mirusync_mobile_session';

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ||
  'https://mirusync.vercel.app';

export function loadMobileSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(MOBILE_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveMobileSession(session: AuthSession | null): void {
  if (!session) {
    localStorage.removeItem(MOBILE_SESSION_KEY);
    return;
  }
  localStorage.setItem(MOBILE_SESSION_KEY, JSON.stringify(session));
}

export async function startMobileOAuth(provider: 'mal' | 'anilist'): Promise<void> {
  const path = provider === 'mal' ? 'auth-mal-start' : 'auth-al-start';
  const url = `${API_BASE}/api/${path}?platform=mobile`;
  try {
    await Browser.open({ url });
  } catch {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = url;
    }
  }
}

export async function exchangeMobileCallbackUrl(urlStr: string): Promise<AuthSession | null> {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'mirusync:') return null;
    const token = url.searchParams.get('session');
    if (!token) return null;

    await Browser.close().catch(() => undefined);

    const res = await fetch(`${API_BASE}/api/auth-mobile-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: token }),
    });
    if (!res.ok) return null;

    const session = (await res.json()) as AuthSession;
    saveMobileSession(session);
    return session;
  } catch {
    return null;
  }
}
