import { Block, Button, Card } from 'konsta/react';
import { useAuthStore } from '@mirusync/core';
import { MobileLayout } from '../layouts/MobileLayout';
import { saveMobileSession } from '../lib/mobileAuth';

export function MobileProfilePage() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);

  function handleSignOut() {
    saveMobileSession(null);
    setSession(null);
  }

  return (
    <MobileLayout title="Profile">
      <Block className="mt-4 space-y-4">
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
            </div>
          </div>
        </Card>

        <Button
          large
          rounded
          outline
          onClick={handleSignOut}
          className="border-rose-500/50 text-rose-300"
        >
          Sign Out
        </Button>
      </Block>
    </MobileLayout>
  );
}
