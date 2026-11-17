import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@mirusync/core';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const hydrateFromWeb = useAuthStore((s) => s.hydrateFromWeb);
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    void hydrateFromWeb();
  }, [hydrateFromWeb]);

  useEffect(() => {
    if (!isLoading) {
      navigate(session ? '/home' : '/?auth_error=session_failed', { replace: true });
    }
  }, [isLoading, session, navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
      <div className="text-center space-y-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent mx-auto" />
        <p className="text-sm text-slate-400">Completing sign-in…</p>
      </div>
    </main>
  );
}
