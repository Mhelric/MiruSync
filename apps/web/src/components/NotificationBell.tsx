import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '@mirusync/core';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markAsRead, markAllRead } = useNotifications(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Notifications"
        className="relative rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 p-1.5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
      >
        <Bell className={`h-4 w-4 ${unreadCount > 0 ? 'animate-bell-ring text-sky-400' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-sky-500 px-1 text-[10px] font-bold text-slate-950 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl z-40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-200">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline cursor-pointer"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/70">
            {items.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No notifications yet.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-800/50 transition-colors cursor-pointer ${
                    n.read ? 'opacity-60' : 'bg-sky-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">
                    {n.body}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
