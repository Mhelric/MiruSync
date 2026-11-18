import { useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { AniListIcon, MalIcon, MiruSyncLogo } from '../components/BrandIcons';
import { startMobileOAuth } from '../lib/mobileAuth';

const SCENES = [
  { title: 'Frieren', image: '/scenes/frieren.gif' },
  { title: 'One Piece', image: '/scenes/onepiece.gif' },
  { title: 'Vinland Saga', image: '/scenes/vinland.gif' },
  { title: 'Naruto', image: '/scenes/naruto.gif' },
  { title: 'Attack on Titan', image: '/scenes/aot.gif' },
  { title: 'Jujutsu Kaisen', image: '/scenes/jjk.gif' },
  { title: 'Demon Slayer', image: '/scenes/demonslayer.gif' },
  { title: 'Solo Leveling', image: '/scenes/sololeveling.gif' },
  { title: 'Fullmetal Alchemist', image: '/scenes/fmab.gif' },
];

export function MobileWelcomePage() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [connecting, setConnecting] = useState<'mal' | 'anilist' | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSceneIdx((prev) => (prev + 1) % SCENES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const sub = Browser.addListener('browserFinished', () => {
      setConnecting(null);
    });
    return () => {
      void sub.then((h) => h.remove());
    };
  }, []);

  useEffect(() => {
    if (!connecting) return;
    const timer = setTimeout(() => setConnecting(null), 12000);
    return () => clearTimeout(timer);
  }, [connecting]);

  function handleLogin(provider: 'mal' | 'anilist') {
    setConnecting(provider);
    void startMobileOAuth(provider).catch(() => setConnecting(null));
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      {/* Blurred Animated Anime Scenes Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {SCENES.map((scene, idx) => (
          <img
            key={scene.title}
            src={scene.image}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover blur-sm scale-105 transition-opacity duration-1000 ${
              idx === sceneIdx ? 'opacity-45 animate-ken-burns' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-950/75" />
      </div>

      {/* Glassmorphism Sign-In Card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl backdrop-blur-2xl bg-slate-900/45 border border-white/15 p-7 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] space-y-6">
        <div className="flex items-center gap-3">
          <MiruSyncLogo className="h-11 w-11 shrink-0 drop-shadow-lg" />
          <span className="text-xl font-bold tracking-tight text-white">
            Miru<span className="text-sky-400">Sync</span>
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight text-white">
            Track anime &amp; manga in one place.
          </h1>
          <p className="text-sm text-slate-300/90 leading-relaxed">
            Sign in with MyAnimeList or AniList. Same fast experience across Desktop and Android, synced live.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <button
            type="button"
            disabled={connecting !== null}
            onClick={() => handleLogin('mal')}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#00a6fb] hover:bg-[#33b8fc] disabled:opacity-70 text-slate-950 font-semibold px-4 py-3 text-sm transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            <MalIcon className="h-5 w-5 rounded" />
            Continue with MyAnimeList
          </button>

          <button
            type="button"
            disabled={connecting !== null}
            onClick={() => handleLogin('anilist')}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 disabled:opacity-70 text-white font-semibold px-4 py-3 text-sm transition-all backdrop-blur-md cursor-pointer"
          >
            <AniListIcon className="h-5 w-5 rounded" />
            Continue with AniList
          </button>
        </div>
      </div>

      {/* Smooth Connecting Overlay */}
      {connecting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/85 backdrop-blur-xl p-6">
          <MiruSyncLogo className="h-14 w-14 animate-pulse" />
          <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
            <span className="h-4 w-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
            Connecting to {connecting === 'mal' ? 'MyAnimeList' : 'AniList'}…
          </div>
          <button
            type="button"
            onClick={() => setConnecting(null)}
            className="mt-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-medium text-slate-200 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </main>
  );
}
