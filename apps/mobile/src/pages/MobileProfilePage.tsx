import { useState } from 'react';
import { Block, BlockTitle, Button, Card, List, ListItem, Toggle } from 'konsta/react';
import {
  db,
  useAuthStore,
  useMediaList,
  useSettingsSync,
} from '@mirusync/core';
import { MobileLayout } from '../layouts/MobileLayout';
import { API_BASE, saveMobileSession } from '../lib/mobileAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function MobileProfilePage() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const { data: animeList } = useMediaList('ANIME', undefined, API_BASE);
  const { data: mangaList } = useMediaList('MANGA', undefined, API_BASE);
  const { settings, updateSettings } = useSettingsSync(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const episodesWatched = (animeList ?? []).reduce((s, e) => s + e.progress, 0);
  const chaptersRead = (mangaList ?? []).reduce((s, e) => s + e.progress, 0);

  function handleSignOut() {
    saveMobileSession(null);
    setSession(null);
  }

  async function handleDeleteCloudData() {
    if (!session?.supabaseJwt) return;
    const res = await fetch(`${API_BASE}/api/account-delete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.supabaseJwt}` },
    });
    if (res.ok) {
      await db.listCache.clear();
      await db.pendingEdits.clear();
      handleSignOut();
    }
  }

  return (
    <MobileLayout title="Profile & Settings">
      <Block className="mt-4">
        <Card className="m-0 bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-4">
            {session?.user.avatarUrl && (
              <img
                src={session.user.avatarUrl}
                alt={session.user.name}
                className="h-14 w-14 rounded-full object-cover border border-slate-700"
              />
            )}
            <div>
              <div className="text-lg font-bold">{session?.user.name}</div>
              <div className="text-xs font-mono text-sky-400 uppercase">
                {session?.provider === 'mal' ? 'MyAnimeList' : 'AniList'}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                {episodesWatched} eps · {chaptersRead} chs
              </div>
            </div>
          </div>
        </Card>
      </Block>

      <BlockTitle>Synced Preferences</BlockTitle>
      <List strong inset className="bg-slate-900/60">
        <ListItem
          title="Notifications"
          after={
            <Toggle
              checked={settings.notifications_enabled}
              onChange={() =>
                void updateSettings({
                  notifications_enabled: !settings.notifications_enabled,
                })
              }
            />
          }
        />
        <ListItem
          title="Spoiler Blur"
          after={
            <Toggle
              checked={settings.spoiler_blur}
              onChange={() =>
                void updateSettings({ spoiler_blur: !settings.spoiler_blur })
              }
            />
          }
        />
        <ListItem
          title="Show Adult (18+)"
          after={
            <Toggle
              checked={settings.show_adult}
              onChange={() =>
                void updateSettings({ show_adult: !settings.show_adult })
              }
            />
          }
        />
      </List>

      <Block className="space-y-3">
        <Button
          large
          rounded
          outline
          onClick={handleSignOut}
          className="border-slate-700 text-slate-200"
        >
          Sign Out
        </Button>

        {!confirmDelete ? (
          <Button
            large
            rounded
            outline
            onClick={() => setConfirmDelete(true)}
            className="border-rose-500/50 text-rose-300"
          >
            Delete Cloud Data
          </Button>
        ) : (
          <Button
            large
            rounded
            onClick={() => void handleDeleteCloudData()}
            className="bg-rose-500 text-slate-950 font-semibold"
          >
            Confirm Delete Cloud Data
          </Button>
        )}
      </Block>
    </MobileLayout>
  );
}
