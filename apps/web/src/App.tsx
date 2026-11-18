import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@mirusync/core';
import { WelcomePage } from './pages/WelcomePage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { HomePage } from './pages/HomePage';
import { TrackerPage } from './pages/TrackerPage';
import { MediaDetailPage } from './pages/MediaDetailPage';
import { SearchPage } from './pages/SearchPage';
import { PopularPage } from './pages/PopularPage';
import { NewReleasesPage } from './pages/NewReleasesPage';
import { CalendarPage } from './pages/CalendarPage';
import { NewsPage } from './pages/NewsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RecapPage } from './pages/RecapPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hydrateFromWeb = useAuthStore((s) => s.hydrateFromWeb);

  useEffect(() => {
    void hydrateFromWeb();
  }, [hydrateFromWeb]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/home" replace /> : <WelcomePage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/home" element={session ? <HomePage /> : <Navigate to="/" replace />} />
      <Route
        path="/anime"
        element={session ? <TrackerPage type="ANIME" /> : <Navigate to="/" replace />}
      />
      <Route
        path="/manga"
        element={session ? <TrackerPage type="MANGA" /> : <Navigate to="/" replace />}
      />
      <Route
        path="/media/:type/:id"
        element={session ? <MediaDetailPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/search"
        element={session ? <SearchPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/popular"
        element={session ? <PopularPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/new-releases"
        element={session ? <NewReleasesPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/calendar"
        element={session ? <CalendarPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/news"
        element={session ? <NewsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/profile"
        element={session ? <ProfilePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/recap"
        element={session ? <RecapPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/settings"
        element={session ? <SettingsPage /> : <Navigate to="/" replace />}
      />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
