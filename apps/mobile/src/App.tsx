import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Button, Dialog, DialogButton } from 'konsta/react';
import {
  useAuthStore,
  useMediaList,
  useSettingsStore,
} from '@mirusync/core';
import {
  API_BASE,
  exchangeMobileCallbackUrl,
  loadMobileSession,
} from './lib/mobileAuth';
import { syncAiringNotificationsAndWidget } from './lib/mobileSyncWidgets';
import { MobileWelcomePage } from './pages/MobileWelcomePage';
import { MobileHomePage } from './pages/MobileHomePage';
import { MobileTrackerPage } from './pages/MobileTrackerPage';
import { MobileDiscoverPage } from './pages/MobileDiscoverPage';
import { MobileProfilePage } from './pages/MobileProfilePage';

const APP_VERSION = '1.0.0';

interface AppVersionInfo {
  version: string;
  apkUrl: string;
  publishedAt?: string;
  notes?: string[];
}

function isNewerVersion(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] ?? 0;
    const lv = l[i] ?? 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function MobileBackgroundSync() {
  const { data: animeList } = useMediaList('ANIME', undefined, API_BASE);
  const notificationsEnabled = useSettingsStore(
    (s) => s.settings.notifications_enabled
  );
  const quietHours = useSettingsStore((s) => s.settings.quiet_hours);
  const titleLang = useSettingsStore((s) => s.settings.title_language);

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

function MobileRoutes() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  useEffect(() => {
    setSession(loadMobileSession());

    const sub = CapApp.addListener('appUrlOpen', async ({ url }) => {
      const exchanged = await exchangeMobileCallbackUrl(url);
      if (exchanged) {
        setSession(exchanged);
      }
    });

    fetch(`${API_BASE}/api/app-version`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AppVersionInfo | null) => {
        if (data?.version && isNewerVersion(data.version, APP_VERSION)) {
          setUpdateInfo(data);
        }
      })
      .catch(() => undefined);

    return () => {
      void sub.then((handle) => handle.remove());
    };
  }, [setSession]);

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {updateInfo && !updateDismissed && (
        <Dialog
          opened={true}
          onBackdropClick={() => setUpdateDismissed(true)}
          title={`Update Available (v${updateInfo.version})`}
          content={
            <div className="space-y-2 text-xs text-slate-300">
              <p>A newer version of MiruSync is ready to download:</p>
              {updateInfo.notes && updateInfo.notes.length > 0 && (
                <ul className="list-disc pl-4 space-y-1">
                  {updateInfo.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
              <div className="pt-2">
                <Button
                  rounded
                  onClick={() => void Browser.open({ url: updateInfo.apkUrl })}
                  className="bg-sky-500 text-slate-950 font-semibold"
                >
                  Download APK Update
                </Button>
              </div>
            </div>
          }
          buttons={
            <DialogButton onClick={() => setUpdateDismissed(true)}>
              Later
            </DialogButton>
          }
        />
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
