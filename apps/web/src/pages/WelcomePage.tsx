import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, ShieldCheck, RefreshCw } from 'lucide-react';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: 'Your login session expired or was invalid. Please try again.',
  missing_code: 'Authorization was cancelled or missing a code.',
  token_exchange_failed: 'Could not exchange OAuth token with the provider.',
  profile_fetch_failed: 'Signed in, but could not load your user profile.',
  profile_missing: 'Provider did not return a valid user profile.',
};

export function WelcomePage() {
  const [searchParams] = useSearchParams();
  const authError = searchParams.get('auth_error');

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-400 mb-3">
          <Sparkles className="h-4 w-4" />
          MiruSync
        </div>

        <h1 className="text-3xl font-bold tracking-tight">
          Track anime &amp; manga in one place.
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in with MyAnimeList or AniList. Same fast experience across Desktop and Android, synced live.
        </p>

        {authError && (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
            {AUTH_ERROR_MESSAGES[authError] ?? `Sign-in failed (${authError}).`}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/api/auth-mal-start"
            className="w-full inline-flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-4 py-2.5 text-sm transition-colors"
          >
            Continue with MyAnimeList
          </a>
          <a
            href="/api/auth-al-start"
            className="w-full inline-flex items-center justify-center rounded-lg border border-indigo-500/50 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 font-semibold px-4 py-2.5 text-sm transition-colors"
          >
            Continue with AniList
          </a>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Live device sync</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span>Official OAuth2</span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/privacy" className="text-[11px] text-slate-500 hover:text-slate-300 underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
