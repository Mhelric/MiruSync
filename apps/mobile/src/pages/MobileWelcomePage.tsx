import { useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Download } from 'lucide-react';
import { AniListIcon, MalIcon, MiruSyncLogo } from '../components/BrandIcons';
import { startMobileOAuth } from '../lib/mobileAuth';
import { openUpdateModal, useUpdateState } from '../lib/updateStore';

const SCENES = [
  { title: 'Frieren', gifUrl: '/scenes/frieren.gif' },
  { title: 'One Piece', gifUrl: '/scenes/onepiece.gif' },
  { title: 'Vinland Saga', gifUrl: '/scenes/vinland.gif' },
  { title: 'Naruto', gifUrl: '/scenes/naruto.gif' },
  { title: 'Attack on Titan', gifUrl: '/scenes/aot.gif' },
  { title: 'Jujutsu Kaisen', gifUrl: '/scenes/jjk.gif' },
  { title: 'Demon Slayer', gifUrl: '/scenes/demonslayer.gif' },
  { title: 'Solo Leveling', gifUrl: '/scenes/sololeveling.gif' },
  { title: 'Fullmetal Alchemist', gifUrl: '/scenes/fmab.gif' },
];

export function MobileWelcomePage() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [connecting, setConnecting] = useState<'mal' | 'anilist' | null>(null);
  const { updateInfo } = useUpdateState();

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
      {updateInfo && (
        <button
          type="button"
          onClick={openUpdateModal}
          className="fixed top-[max(env(safe-area-inset-top),0.75rem)] left-4 right-4 z-40 rounded-2xl border border-sky-400/40 bg-slate-900/80 backdrop-blur-xl px-3.5 py-2 flex items-center justify-between gap-2 text-xs text-sky-300 shadow-xl cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5 font-medium truncate">
            <Download className="h-3.5 w-3.5 shrink-0 animate-float-idle" />
            Update v{updateInfo.version} available
          </span>
          <span className="font-semibold underline shrink-0">Tap to update</span>
        </button>
      )}

      {/* Full-Screen Crisp Unblurred Anime Scene Background */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-slate-950" aria-hidden="true">
        {SCENES.map((scene, idx) => (
          <img
            key={scene.title}
            src={scene.gifUrl}
            alt={scene.title}
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ${
              idx === sceneIdx ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ imageRendering: 'auto' }}
          />
        ))}
        {/* Light radial vignette so the crisp GIF stays vivid & visible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at center, rgba(2,6,23,0.12) 0%, rgba(2,6,23,0.42) 75%, rgba(2,6,23,0.65) 100%)',
          }}
        />
      </div>

      {/* True Translucent Glassmorphism Sign-In Card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl overflow-hidden bg-slate-950/35 backdrop-blur-md border border-white/25 p-7 shadow-2xl space-y-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MiruSyncLogo className="h-11 w-11 shrink-0 animate-float-idle" />
            <span className="text-xl font-bold tracking-tight text-white">
              Miru<span className="text-sky-400">Sync</span>
            </span>
          </div>
          <span className="rounded-full bg-white/15 border border-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white/90 truncate max-w-[125px]">
            {SCENES[sceneIdx]?.title}
          </span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight text-white">
            Track anime &amp; manga in one place.
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Sign in with MyAnimeList or AniList. Same fast experience across Desktop and Android, synced live.
          </p>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={connecting !== null}
            onClick={() => handleLogin('mal')}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#00a6fb] hover:bg-[#0094e0] active:scale-[0.98] disabled:opacity-70 text-white font-semibold px-4 py-3 text-sm transition-all cursor-pointer"
          >
            <MalIcon className="h-5 w-5 rounded" />
            Continue with MyAnimeList
          </button>

          <button
            type="button"
            disabled={connecting !== null}
            onClick={() => handleLogin('anilist')}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/25 bg-white/15 hover:bg-white/20 backdrop-blur-md active:scale-[0.98] disabled:opacity-70 text-white font-semibold px-4 py-3 text-sm transition-all cursor-pointer"
          >
            <AniListIcon className="h-5 w-5 rounded" />
            Continue with AniList
          </button>
        </div>
      </div>

      {/* Smooth Connecting Overlay */}
      {connecting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/85 backdrop-blur-xl p-6 text-slate-100">
          <MiruSyncLogo className="h-14 w-14 animate-pulse" />
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <span className="h-4 w-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
            Connecting to {connecting === 'mal' ? 'MyAnimeList' : 'AniList'}…
          </div>
          <button
            type="button"
            onClick={() => setConnecting(null)}
            className="mt-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-slate-200 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </main>
  );
}
