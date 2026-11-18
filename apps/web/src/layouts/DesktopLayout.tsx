import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Download,
  Flame,
  Home,
  LogOut,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Tv,
  User,
  WifiOff,
} from 'lucide-react';
import {
  useAuthStore,
  useOnlineStatus,
  usePendingEditsSync,
  useSettingsSync,
} from '@mirusync/core';
import { CommandSearchModal } from '../components/CommandSearchModal';
import { NotificationBell } from '../components/NotificationBell';
import { MiruSyncLogo } from '../components/BrandIcons';

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/anime', label: 'Anime', icon: Tv },
  { to: '/manga', label: 'Manga', icon: BookOpen },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/popular', label: 'Popular', icon: Flame },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
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
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Hidable Left Sidebar */}
      <aside
        className={`shrink-0 border-r border-slate-800/80 bg-slate-900/40 flex flex-col justify-between p-3 sticky top-0 h-screen transition-all duration-300 ease-out ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div>
          <div className="px-1.5 py-2 mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <MiruSyncLogo className="h-7 w-7 shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap">
                  Miru<span className="text-sky-400">Sync</span>
                </span>
              )}
            </div>

            {!sidebarCollapsed && (
              <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-400">
                {session?.provider === 'mal' ? 'MAL' : 'AL'}
              </span>
            )}
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
        <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              title="Toggle sidebar (Ctrl+B)"
              className="rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 p-1.5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:border-slate-700 px-3 py-1.5 text-sm text-slate-400 w-64 sm:w-72 justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5" />
                Search anime &amp; manga…
              </span>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                Ctrl K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {(!online || pendingCount > 0) && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                <WifiOff className="h-3.5 w-3.5" />
                {!online
                  ? 'Offline — edits queued'
                  : `Syncing ${pendingCount} queued edit${pendingCount > 1 ? 's' : ''}…`}
              </span>
            )}

            <NotificationBell />

            {session?.user.avatarUrl && (
              <img
                src={session.user.avatarUrl}
                alt={session.user.name}
                className="h-7 w-7 rounded-full object-cover border border-slate-700"
              />
            )}
            <span className="text-sm font-medium text-slate-200 hidden sm:inline">
              {session?.user.name}
            </span>
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

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>

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
