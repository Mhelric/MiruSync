import { useEffect, useRef, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Download, LogOut, Sparkles, X } from 'lucide-react';
import {
  useAuthStore,
  useMediaList,
  useSettingsStore,
  useSettingsSync,
} from '@mirusync/core';
import {
  API_BASE,
  exchangeMobileCallbackUrl,
  loadMobileSession,
} from './lib/mobileAuth';
import { syncAiringNotificationsAndWidget } from './lib/mobileSyncWidgets';
import { registerMobilePush } from './lib/mobilePush';
import {
  closeUpdateModal,
  setUpdateAvailable,
  useUpdateState,
  type AppVersionInfo,
} from './lib/updateStore';
import { MobileWelcomePage } from './pages/MobileWelcomePage';
import { MobileHomePage } from './pages/MobileHomePage';
import { MobileTrackerPage } from './pages/MobileTrackerPage';
import { MobileDiscoverPage } from './pages/MobileDiscoverPage';
import { MobileProfilePage } from './pages/MobileProfilePage';
import { MobileMediaDetailPage } from './pages/MobileMediaDetailPage';
import { MobileSettingsPage } from './pages/MobileSettingsPage';
import { MiruSyncLogo } from './components/BrandIcons';

const FALLBACK_APP_VERSION =
  (import.meta.env.VITE_APP_VERSION as string | undefined) || '1.1.0';

function isNewerVersion(remote: string, local: string): boolean {
  const clean = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  const r = clean(remote);
  const l = clean(local);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] ?? 0;
    const lv = l[i] ?? 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

const QUERY_CACHE_KEY = 'mirusync_mobile_query_cache_v1';
const QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: QUERY_CACHE_MAX_AGE_MS,
    },
  },
});

function hydrateQueryCache(client: QueryClient) {
  try {
    const raw = localStorage.getItem(QUERY_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      ts: number;
      entries: Array<{ queryKey: unknown[]; data: unknown; dataUpdatedAt: number }>;
    };
    if (!parsed?.ts || Date.now() - parsed.ts > QUERY_CACHE_MAX_AGE_MS) return;
    for (const entry of parsed.entries || []) {
      if (Array.isArray(entry.queryKey) && entry.data !== undefined) {
        client.setQueryData(entry.queryKey, entry.data, {
          updatedAt: entry.dataUpdatedAt || parsed.ts,
        });
      }
    }
  } catch {
    // Ignore corrupt cache
  }
}

hydrateQueryCache(queryClient);

let saveCacheTimer: ReturnType<typeof setTimeout> | null = null;
queryClient.getQueryCache().subscribe((event) => {
  if (event?.type !== 'updated' || event.query.state.status !== 'success') return;
  if (saveCacheTimer) clearTimeout(saveCacheTimer);
  saveCacheTimer = setTimeout(() => {
    try {
      const entries = queryClient
        .getQueryCache()
        .getAll()
        .filter((q) => q.state.status === 'success' && q.state.data !== undefined)
        .slice(0, 40)
        .map((q) => ({
          queryKey: q.queryKey,
          data: q.state.data,
          dataUpdatedAt: q.state.dataUpdatedAt,
        }));
      localStorage.setItem(
        QUERY_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), entries })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, 500);
});

const MOBILE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const MOBILE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function MobileBackgroundSync() {
  useSettingsSync(MOBILE_SUPABASE_URL, MOBILE_SUPABASE_ANON_KEY, API_BASE);
  const session = useAuthStore((s) => s.session);
  const { data: animeList } = useMediaList('ANIME', undefined, API_BASE);
  const notificationsEnabled = useSettingsStore(
    (s) => s.settings.notifications_enabled
  );
  const quietHours = useSettingsStore((s) => s.settings.quiet_hours);
  const titleLang = useSettingsStore((s) => s.settings.title_language);

  useEffect(() => {
    if (!session?.user.id || !notificationsEnabled) return;
    void registerMobilePush(session.user.id, session.supabaseJwt);
  }, [session?.user.id, session?.supabaseJwt, notificationsEnabled]);

  useEffect(() => {
    if (!animeList) return;
    void syncAiringNotificationsAndWidget(
      animeList,
      notificationsEnabled,
      quietHours,
      titleLang
    );
  }, [animeList, notificationsEnabled, quietHours, titleLang]);

  return null;
}

const MAIN_TAB_PATHS = new Set([
  '/',
  '/home',
  '/anime',
  '/manga',
  '/discover',
  '/profile',
]);

function MobileRoutes() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const { updateInfo, modalOpen } = useUpdateState();
  const [confirmExit, setConfirmExit] = useState(false);
  const [booting, setBooting] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();
  const pathRef = useRef(location.pathname);
  const modalOpenRef = useRef(modalOpen);
  const confirmExitRef = useRef(confirmExit);

  pathRef.current = location.pathname;
  modalOpenRef.current = modalOpen;
  confirmExitRef.current = confirmExit;

  useEffect(() => {
    const backSub = CapApp.addListener('backButton', () => {
      if (modalOpenRef.current) {
        closeUpdateModal();
        return;
      }
      if (confirmExitRef.current) {
        setConfirmExit(false);
        return;
      }
      if (!MAIN_TAB_PATHS.has(pathRef.current)) {
        navigate(-1);
        return;
      }
      setConfirmExit(true);
    });

    return () => {
      void backSub.then((h) => h.remove());
    };
  }, [navigate]);

  useEffect(() => {
    setSession(loadMobileSession());
    const bootTimer = setTimeout(() => setBooting(false), 550);

    const sub = CapApp.addListener('appUrlOpen', async ({ url }) => {
      const exchanged = await exchangeMobileCallbackUrl(url);
      if (exchanged) {
        setSession(exchanged);
      }
    });

    let cancelled = false;
    async function checkForUpdate() {
      let currentVersion = FALLBACK_APP_VERSION;
      try {
        const info = await CapApp.getInfo();
        if (info?.version) {
          currentVersion = info.version;
        }
      } catch {
        // Running in web preview without native Capacitor runtime
      }

      try {
        const res = await fetch(`${API_BASE}/api/app-version?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as AppVersionInfo | null;
        if (
          !cancelled &&
          data?.version &&
          isNewerVersion(data.version, currentVersion)
        ) {
          setUpdateAvailable(data);
        }
      } catch {
        // Offline or unreachable
      }
    }

    void checkForUpdate();
    const stateSub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void checkForUpdate();
      }
    });
    const poll = setInterval(() => {
      void checkForUpdate();
    }, 120_000);

    return () => {
      cancelled = true;
      clearTimeout(bootTimer);
      clearInterval(poll);
      void sub.then((handle) => handle.remove());
      void stateSub.then((handle) => handle.remove());
    };
  }, [setSession]);

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center gap-3">
        <MiruSyncLogo className="h-16 w-16 animate-pulse" />
        <span className="text-lg font-bold tracking-tight">
          Miru<span className="text-sky-400">Sync</span>
        </span>
      </div>
    );
  }

  return (
    <>
      {session && <MobileBackgroundSync />}
      <Routes>
        <Route
          path="/"
          element={session ? <Navigate to="/home" replace /> : <MobileWelcomePage />}
        />
        <Route
          path="/home"
          element={session ? <MobileHomePage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/anime"
          element={
            session ? <MobileTrackerPage type="ANIME" /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/manga"
          element={
            session ? <MobileTrackerPage type="MANGA" /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/discover"
          element={session ? <MobileDiscoverPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/profile"
          element={session ? <MobileProfilePage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/settings"
          element={session ? <MobileSettingsPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/media/:type/:id"
          element={session ? <MobileMediaDetailPage /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {updateInfo && modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-5"
          onClick={closeUpdateModal}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl space-y-4 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Update Available
                  </h2>
                  <p className="text-xs font-mono text-sky-400">
                    v{updateInfo.version}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeUpdateModal}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Close update prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              A newer MiruSync APK is ready. Install it directly over your current app without losing your session.
            </p>

            {updateInfo.notes && updateInfo.notes.length > 0 && (
              <ul className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                {updateInfo.notes.map((n, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-sky-400 mt-0.5">•</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => void Browser.open({ url: updateInfo.apkUrl })}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 py-3 px-4 text-sm font-semibold text-slate-950 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Download &amp; Install Update
              </button>
              <button
                type="button"
                onClick={closeUpdateModal}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800 py-2.5 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmExit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-5"
          onClick={() => setConfirmExit(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl space-y-4 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0">
                <LogOut className="h-4 w-4 text-rose-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Exit MiruSync?</h2>
                <p className="text-xs text-slate-400">
                  Are you sure you want to close the app?
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800 py-2.5 text-xs font-medium text-slate-300 cursor-pointer"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => void CapApp.exitApp()}
                className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-400 py-2.5 text-xs font-semibold text-white cursor-pointer"
              >
                Exit App
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MobileRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
