import { Block, Button, Navbar, Page } from 'konsta/react';

export default function App() {
  return (
    <Page>
      <Navbar title="MiruSync" />
      <Block strong inset className="space-y-4">
        <p className="text-sm text-slate-400">
          One tracker. Two platforms. Perfectly in sync.
        </p>
        <div className="space-y-2">
          <Button disabled>Continue with MyAnimeList (Phase 1)</Button>
          <Button disabled outline>
            Continue with AniList (Phase 1)
          </Button>
        </div>
      </Block>
    </Page>
  );
}
