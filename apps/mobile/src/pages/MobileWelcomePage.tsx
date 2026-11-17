import { Block, Button, Page } from 'konsta/react';
import { Sparkles } from 'lucide-react';
import { startMobileOAuth } from '../lib/mobileAuth';

export function MobileWelcomePage() {
  return (
    <Page className="bg-slate-950 text-slate-50 flex flex-col justify-center">
      <Block className="space-y-6 my-auto px-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sky-400">
            <Sparkles className="h-4 w-4" />
            MiruSync
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Track anime &amp; manga anywhere.
          </h1>
          <p className="text-sm text-slate-400">
            Sign in with MyAnimeList or AniList. Synced live with your desktop.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            large
            rounded
            onClick={() => void startMobileOAuth('mal')}
            className="bg-sky-500 text-slate-950 font-semibold"
          >
            Continue with MyAnimeList
          </Button>
          <Button
            large
            rounded
            outline
            onClick={() => void startMobileOAuth('anilist')}
            className="border-indigo-500/60 text-indigo-300"
          >
            Continue with AniList
          </Button>
        </div>
      </Block>
    </Page>
  );
}
