import { LogOut, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@mirusync/core';

export function HomePage() {
  const session = useAuthStore((s) => s.session);
  const logoutWeb = useAuthStore((s) => s.logoutWeb);

  if (!session) return null;

  const { user, provider, supabaseJwt } = session;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <header className="max-w-5xl mx-auto flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight">MiruSync</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {provider === 'mal' ? 'MyAnimeList' : 'AniList'} Connected
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover border border-slate-700"
            />
          )}
          <span className="text-sm font-medium text-slate-200">{user.name}</span>
          <button
            type="button"
            onClick={() => void logoutWeb()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
        <h2 className="text-xl font-semibold">Welcome back, {user.name}</h2>
        <p className="mt-1 text-sm text-slate-400">
          Phase 1 authentication is active. Your normalized user ID is{' '}
          <code className="font-mono text-sky-400">{user.id}</code>
          {supabaseJwt ? ' with a signed Supabase JWT ready for live sync.' : '.'}
        </p>
      </main>
    </div>
  );
}
