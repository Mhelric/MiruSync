import { useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Compass, Download, Home, Search, Settings, Tv, User } from 'lucide-react';
import { useAuthStore } from '@mirusync/core';
import { AniListIcon, MalIcon, MiruSyncLogo } from '../components/BrandIcons';
import { MobileQuickSearchModal } from '../components/MobileQuickSearchModal';
import { openUpdateModal, useUpdateState } from '../lib/updateStore';

const TABS = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/anime', label: 'Anime', icon: Tv },
  { path: '/manga', label: 'Manga', icon: BookOpen },
  { path: '/discover', label: 'Discover', icon: Compass },
  { path: '/profile', label: 'Profile', icon: User },
];

export function MobileLayout({
  title,
  showBack = false,
  hideBottomNav = false,
  children,
}: {
  title?: string;
  showBack?: boolean;
  hideBottomNav?: boolean;
  children: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const { updateInfo } = useUpdateState();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Native-style Glass Top App Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        {updateInfo && (
          <button
            type="button"
            onClick={openUpdateModal}
            className="w-full bg-sky-500/15 border-b border-sky-500/30 px-3.5 py-1.5 flex items-center justify-between gap-2 text-xs text-sky-300 cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5 font-medium truncate">
              <Download className="h-3.5 w-3.5 shrink-0" />
              Update v{updateInfo.version} available
            </span>
            <span className="font-semibold underline shrink-0">Tap to update</span>
          </button>
        )}
        <div className="h-14 px-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {showBack ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-900/80 flex items-center justify-center text-slate-300 active:scale-95 transition-transform cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <NavLink to="/home" className="shrink-0 flex items-center gap-2">
                <MiruSyncLogo className="h-8 w-8" />
              </NavLink>
            )}
            <span className="text-base font-bold tracking-tight truncate">
              {title ? (
                title
              ) : (
                <>
                  Miru<span className="text-sky-400">Sync</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="h-9 w-9 rounded-xl border border-slate-800/90 bg-slate-900/75 flex items-center justify-center text-slate-300 active:scale-90 transition-transform cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>

            <NavLink
              to="/profile"
              className="flex items-center gap-1.5 rounded-full border border-slate-800/90 bg-slate-900/75 pl-1 pr-2 py-1"
            >
              {session?.user.avatarUrl ? (
                <img
                  src={session.user.avatarUrl}
                  alt={session.user.name}
                  className="h-6 w-6 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-300">
                  {session?.user.name.slice(0, 1).toUpperCase() || 'M'}
                </div>
              )}
              {session?.provider === 'mal' ? (
                <MalIcon className="h-3.5 w-3.5 rounded-[3px]" />
              ) : (
                <AniListIcon className="h-3.5 w-3.5 rounded-[3px]" />
              )}
            </NavLink>

            <NavLink
              to="/settings"
              aria-label="Settings"
              className={({ isActive }) =>
                `h-9 w-9 rounded-xl border flex items-center justify-center transition-colors ${
                  isActive
                    ? 'border-sky-500/40 bg-sky-500/15 text-sky-400'
                    : 'border-slate-800/90 bg-slate-900/75 text-slate-300'
                }`
              }
            >
              <Settings className="h-4 w-4" />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Main Scroll Area */}
      <main className={`flex-1 px-3.5 pt-4 ${hideBottomNav ? 'pb-8' : 'pb-28'} min-w-0`}>
        {children}
      </main>

      {/* Floating Glassmorphic Mobile App Dock */}
      {!hideBottomNav && (
        <nav
          aria-label="Mobile navigation"
          className="fixed bottom-1.5 left-2.5 right-2.5 z-40 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-[0_14px_40px_rgba(0,0,0,0.65)] px-2 py-2 mb-[env(safe-area-inset-bottom)]"
        >
          <div className="grid grid-cols-5 gap-1">
            {TABS.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              const isIdleAnimated = path === '/anime' || path === '/manga';
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => navigate(path)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-sky-500/15 text-sky-400 font-semibold'
                      : 'text-slate-400 active:scale-95'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform ${
                      active ? 'scale-110 animate-icon-pop' : isIdleAnimated ? 'animate-float-idle' : ''
                    }`}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <MobileQuickSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
