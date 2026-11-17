import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@mirusync/core';
import { WelcomePage } from './pages/WelcomePage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { HomePage } from './pages/HomePage';
import { TrackerPage } from './pages/TrackerPage';
import { MediaDetailPage } from './pages/MediaDetailPage';
import { DesktopLayout } from './layouts/DesktopLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ComingSoonPage({ title, phase }: { title: string; phase: string }) {
  return (
    <DesktopLayout>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center">
        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-mono text-sky-400">
          {phase}
        </span>
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">
          This section is scheduled for {phase}.
        </p>
      </div>
    </DesktopLayout>
  );
}

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
        element={
          session ? (
            <ComingSoonPage title="Search & Filters" phase="Phase 3" />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/popular"
        element={
          session ? (
            <ComingSoonPage title="Popular & Seasonal" phase="Phase 3" />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/calendar"
        element={
          session ? (
            <ComingSoonPage title="Release Calendar" phase="Phase 4" />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/news"
        element={
          session ? (
            <ComingSoonPage title="Anime News" phase="Phase 4" />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/profile"
        element={
          session ? (
            <ComingSoonPage title="Profile & Stats" phase="Phase 7" />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/settings"
        element={
          session ? (
            <ComingSoonPage title="Settings & Sync" phase="Phase 7" />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
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
