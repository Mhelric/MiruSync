import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Flame,
  Home,
  LogOut,
  Newspaper,
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

export function DesktopLayout({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const logoutWeb = useAuthStore((s) => s.logoutWeb);
  const online = useOnlineStatus();
  const pendingCount = usePendingEditsSync();
  useSettingsSync(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  );
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Left Sidebar */}
      <aside className="w-60 shrink-0 border-r border-slate-800/80 bg-slate-900/40 flex flex-col justify-between p-4 sticky top-0 h-screen">
        <div>
          <div className="px-2 py-2 mb-4 flex items-center justify-between">
            <span className="text-lg font-bold tracking-tight text-slate-50">
              Miru<span className="text-sky-400">Sync</span>
            </span>
            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-400">
              {session?.provider === 'mal' ? 'MAL' : 'AL'}
            </span>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="space-y-1 pt-4 border-t border-slate-800/80">
          {BOTTOM_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:border-slate-700 px-3 py-1.5 text-sm text-slate-400 w-72 justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Search anime &amp; manga…
            </span>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              Ctrl K
            </kbd>
          </button>

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
            <span className="text-sm font-medium text-slate-200">
              {session?.user.name}
            </span>
            <button
              type="button"
              onClick={() => void logoutWeb()}
              title="Sign out"
              className="rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 p-1.5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      <CommandSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
