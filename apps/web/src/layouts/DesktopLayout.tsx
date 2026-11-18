import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Compass,
  Download,
  Flame,
  Home,
  LogOut,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  Tv,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import {
  useAuthStore,
  useOnlineStatus,
  usePendingEditsSync,
  useSettingsSync,
} from '@mirusync/core';
import { CommandSearchModal } from '../components/CommandSearchModal';
import { NotificationBell } from '../components/NotificationBell';
import { AniListIcon, MalIcon, MiruSyncLogo } from '../components/BrandIcons';

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/anime', label: 'Anime', icon: Tv },
  { to: '/manga', label: 'Manga', icon: BookOpen },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/popular', label: 'Popular', icon: Flame },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/new-releases', label: 'New Releases', icon: Sparkles },
  { to: '/news', label: 'News', icon: Newspaper },
];

const BOTTOM_ITEMS = [
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const APK_DOWNLOAD_URL =
  'https://github.com/Mhelric/MiruSync/releases/latest/download/MiruSync.apk';

export function DesktopLayout({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const logoutWeb = useAuthStore((s) => s.logoutWeb);
  const online = useOnlineStatus();
  const pendingCount = usePendingEditsSync();
  const location = useLocation();
  useSettingsSync(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [mobileDiscoverOpen, setMobileDiscoverOpen] = useState(false);

  const isDiscoverRoute = [
    '/popular',
    '/calendar',
    '/new-releases',
    '/news',
    '/search',
  ].some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    setMobileDiscoverOpen(false);
  }, [location.pathname]);

  const activeNavIndex = NAV_ITEMS.findIndex((item) =>
    location.pathname.startsWith(item.to)
  );
  const activeBottomIndex = BOTTOM_ITEMS.findIndex((item) =>
    location.pathname.startsWith(item.to)
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex overflow-x-hidden">
      {/* Hidable Left Sidebar (Desktop) */}
      <aside
        className={`hidden md:flex shrink-0 border-r border-slate-800/80 bg-slate-900/40 flex-col justify-between p-3 sticky top-0 h-screen transition-all duration-300 ease-out ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div>
          <div
            className={`px-1.5 py-2 mb-4 flex items-center ${
              sidebarCollapsed ? 'flex-col gap-2.5 justify-center' : 'justify-between gap-2'
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <MiruSyncLogo className="h-7 w-7 shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap">
                  Miru<span className="text-sky-400">Sync</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              title="Toggle sidebar (Ctrl+B)"
              className="rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 p-1.5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer shrink-0"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className="relative space-y-1">
            {/* Sliding Active Highlight Pill */}
            {activeNavIndex !== -1 && (
              <div
                aria-hidden="true"
                className="absolute left-0 right-0 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 transition-transform duration-300 ease-out pointer-events-none"
                style={{ transform: `translateY(${activeNavIndex * 40}px)` }}
              />
            )}

            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={sidebarCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `relative z-10 h-9 flex items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                    sidebarCollapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'text-sky-400'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="space-y-1 pt-3 border-t border-slate-800/80">
          <div className="relative space-y-1">
            {activeBottomIndex !== -1 && (
              <div
                aria-hidden="true"
                className="absolute left-0 right-0 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 transition-transform duration-300 ease-out pointer-events-none"
                style={{ transform: `translateY(${activeBottomIndex * 40}px)` }}
              />
            )}

            {BOTTOM_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={sidebarCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `relative z-10 h-9 flex items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                    sidebarCollapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'text-sky-400'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </div>

          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noreferrer"
            title="Download Android APK"
            className={`h-9 flex items-center gap-3 rounded-lg px-2.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <Download className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Download APK</span>}
          </a>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <NavLink to="/home" className="md:hidden shrink-0" aria-label="MiruSync Home">
              <MiruSyncLogo className="h-7 w-7" />
            </NavLink>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 hover:border-slate-700 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-slate-400 w-auto sm:w-72 justify-start transition-colors cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate hidden sm:inline">Search anime &amp; manga…</span>
              <span className="sm:hidden">Search…</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {(!online || pendingCount > 0) && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 sm:px-2.5 py-1 text-xs text-amber-300">
                <WifiOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {!online
                    ? 'Offline — edits queued'
                    : `Syncing ${pendingCount} queued edit${pendingCount > 1 ? 's' : ''}…`}
                </span>
              </span>
            )}

            <NotificationBell />

            <NavLink
              to="/profile"
              className="flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 pl-1.5 pr-2 sm:pr-2.5 py-1 transition-colors"
              title={`Signed in with ${session?.provider === 'mal' ? 'MyAnimeList' : 'AniList'}`}
            >
              {session?.user.avatarUrl ? (
                <img
                  src={session.user.avatarUrl}
                  alt={session.user.name}
                  className="h-6 w-6 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                  {session?.user.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-slate-200 hidden sm:inline">
                {session?.user.name}
              </span>
              {session?.provider === 'mal' ? (
                <MalIcon className="h-4 w-4 shrink-0 rounded-[4px]" />
              ) : (
                <AniListIcon className="h-4 w-4 shrink-0 rounded-[4px]" />
              )}
            </NavLink>
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              title="Sign out"
              className="rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 p-1.5 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-6 pb-24 md:pb-6 max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Discover / More Sheet */}
      {mobileDiscoverOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-slate-950/65 backdrop-blur-xs"
          onClick={() => setMobileDiscoverOpen(false)}
        >
          <div
            className="fixed bottom-16 left-3 right-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Discover &amp; More
              </span>
              <button
                type="button"
                onClick={() => setMobileDiscoverOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/popular', label: 'Popular', icon: Flame },
                { to: '/calendar', label: 'Calendar', icon: Calendar },
                { to: '/new-releases', label: 'New Releases', icon: Sparkles },
                { to: '/news', label: 'News', icon: Newspaper },
                { to: '/search', label: 'Search', icon: Search },
              ].map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-sky-500/40 bg-sky-500/15 text-sky-400'
                        : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>

            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-medium text-emerald-400"
            >
              <Download className="h-4 w-4" />
              Download Android APK
            </a>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar (matches Android app UI) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-lg grid grid-cols-5 px-1"
      >
        {[
          { to: '/home', label: 'Home', icon: Home },
          { to: '/anime', label: 'Anime', icon: Tv },
          { to: '/manga', label: 'Manga', icon: BookOpen },
        ].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-sky-400' : 'text-slate-400'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setMobileDiscoverOpen((prev) => !prev)}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
            mobileDiscoverOpen || isDiscoverRoute ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          <Compass className="h-5 w-5" />
          <span>Discover</span>
        </button>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-sky-400' : 'text-slate-400'
            }`
          }
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </NavLink>
      </nav>

      <CommandSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Sign Out Confirmation Modal */}
      {confirmLogout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4"
          onClick={() => setConfirmLogout(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl backdrop-blur-xl bg-slate-900/90 border border-white/15 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Sign out of MiruSync?
                </h2>
                <p className="text-xs text-slate-400">
                  You can sign back in anytime with {session?.provider === 'mal' ? 'MyAnimeList' : 'AniList'}.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="rounded-lg border border-slate-700 hover:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmLogout(false);
                  void logoutWeb();
                }}
                className="rounded-lg bg-rose-500 hover:bg-rose-400 px-4 py-2 text-xs font-semibold text-slate-950 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
