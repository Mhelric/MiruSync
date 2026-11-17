import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Page, Tabbar, TabbarLink } from 'konsta/react';
import { BookOpen, Compass, Home, Tv, User } from 'lucide-react';

const TABS = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/anime', label: 'Anime', icon: Tv },
  { path: '/manga', label: 'Manga', icon: BookOpen },
  { path: '/discover', label: 'Discover', icon: Compass },
  { path: '/profile', label: 'Profile', icon: User },
];

export function MobileLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Page className="bg-slate-950 text-slate-50 pb-16">
      <Navbar title={title} className="bg-slate-900/90" />

      <div className="pb-20">{children}</div>

      <Tabbar labels icons className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 border-t border-slate-800">
        {TABS.map(({ path, label, icon: Icon }) => (
          <TabbarLink
            key={path}
            active={location.pathname === path}
            onClick={() => navigate(path)}
            icon={<Icon className="h-5 w-5" />}
            label={label}
          />
        ))}
      </Tabbar>
    </Page>
  );
}
