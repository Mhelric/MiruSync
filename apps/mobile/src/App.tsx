import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as CapApp } from '@capacitor/app';
import { useAuthStore } from '@mirusync/core';
import {
  exchangeMobileCallbackUrl,
  loadMobileSession,
} from './lib/mobileAuth';
import { MobileWelcomePage } from './pages/MobileWelcomePage';
import { MobileHomePage } from './pages/MobileHomePage';
import { MobileTrackerPage } from './pages/MobileTrackerPage';
import { MobileDiscoverPage } from './pages/MobileDiscoverPage';
import { MobileProfilePage } from './pages/MobileProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function MobileRoutes() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    setSession(loadMobileSession());

    const sub = CapApp.addListener('appUrlOpen', async ({ url }) => {
      const exchanged = await exchangeMobileCallbackUrl(url);
      if (exchanged) {
        setSession(exchanged);
      }
    });

    return () => {
      void sub.then((handle) => handle.remove());
    };
  }, [setSession]);

  return (
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
