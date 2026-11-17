export default function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-50 p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 mb-4">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Phase 0 Ready
        </div>
        <h1 className="text-3xl font-bold tracking-tight">MiruSync</h1>
        <p className="mt-2 text-sm text-slate-400">
          One tracker. Two platforms. Perfectly in sync.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            disabled
            className="w-full rounded-lg bg-sky-500/20 border border-sky-500/40 px-4 py-2.5 text-sm font-medium text-sky-300 opacity-75 cursor-not-allowed"
          >
            Continue with MyAnimeList (Phase 1)
          </button>
          <button
            type="button"
            disabled
            className="w-full rounded-lg bg-indigo-500/20 border border-indigo-500/40 px-4 py-2.5 text-sm font-medium text-indigo-300 opacity-75 cursor-not-allowed"
          >
            Continue with AniList (Phase 1)
          </button>
        </div>
      </div>
    </main>
  );
}
