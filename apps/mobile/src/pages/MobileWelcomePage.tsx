import { useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Download } from 'lucide-react';
import { AniListIcon, MalIcon, MiruSyncLogo } from '../components/BrandIcons';
import { startMobileOAuth } from '../lib/mobileAuth';
import { openUpdateModal, useUpdateState } from '../lib/updateStore';

const SCENES = [
  { title: 'Frieren', gifUrl: '/scenes/frieren.gif', durationMs: 2200 },
  { title: 'One Piece', gifUrl: '/scenes/onepiece.gif', durationMs: 4600 },
  { title: 'Vinland Saga', gifUrl: '/scenes/vinland.gif', durationMs: 1400 },
  { title: 'Attack on Titan', gifUrl: '/scenes/aot.gif', durationMs: 5500 },
  { title: 'Jujutsu Kaisen', gifUrl: '/scenes/jjk.gif', durationMs: 7260 },
  { title: 'Demon Slayer', gifUrl: '/scenes/demonslayer.gif', durationMs: 3200 },
  { title: 'My Hero Academia', gifUrl: '/scenes/mha.gif', durationMs: 1800 },
  { title: 'Fullmetal Alchemist', gifUrl: '/scenes/fmab.gif', durationMs: 2500 },
  { title: 'Black Clover', gifUrl: '/scenes/asta-swordofthewizardking.gif', durationMs: 4010 },
  { title: 'Dandadan', gifUrl: '/scenes/dandadan.gif', durationMs: 5600 },
  { title: 'Deku', gifUrl: '/scenes/deku-mha.gif', durationMs: 1560 },
  { title: 'Dr. Stone', gifUrl: '/scenes/dr-stone-tsukasa.gif', durationMs: 3810 },
  { title: 'Gurren Lagann', gifUrl: '/scenes/gurren-lagann-simon.gif', durationMs: 1900 },
  { title: 'Haikyu!!', gifUrl: '/scenes/haikyuu-anime.gif', durationMs: 2000 },
  { title: 'Kimi ni Todoke', gifUrl: '/scenes/hold-close-comfurt-anime.gif', durationMs: 1760 },
  { title: 'KonoSuba', gifUrl: '/scenes/megumin-thumbs-up.gif', durationMs: 3000 },
  { title: 'Naruto & Sasuke', gifUrl: '/scenes/naruto-sasuke.gif', durationMs: 1600 },
  { title: 'Solo Leveling', gifUrl: '/scenes/solo-leveling-statue-smile-solo-leveling.gif', durationMs: 3100 },
];

function buildShuffledQueue(length: number, excludeFirst?: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (excludeFirst !== undefined && arr.length > 1 && arr[0] === excludeFirst) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

export function MobileWelcomePage() {
  const [queue, setQueue] = useState<number[]>(() => buildShuffledQueue(SCENES.length));
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [loaded, setLoaded] = useState(true);
  const [connecting, setConnecting] = useState<'mal' | 'anilist' | null>(null);
  const { updateInfo } = useUpdateState();

  const sceneIdx = queue[0] ?? 0;
  const nextIdx = queue[1] ?? 0;

  useEffect(() => {
    const preload = new Image();
    preload.src = SCENES[nextIdx].gifUrl;

    const duration = SCENES[sceneIdx]?.durationMs ?? 3000;
    const timer = setTimeout(() => {
      setPrevIdx(sceneIdx);
      setLoaded(false);
      setQueue((prev) => {
        const rest = prev.slice(1);
        return rest.length >= 2 ? rest : [...rest, ...buildShuffledQueue(SCENES.length, rest[0] ?? sceneIdx)];
      });
      setPlayCount((c) => c + 1);
    }, duration);
    return () => clearTimeout(timer);
  }, [sceneIdx, nextIdx, playCount]);

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
        {prevIdx !== null && (
          <img
            src={SCENES[prevIdx].gifUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            style={{ imageRendering: 'auto' }}
          />
        )}
        <img
          key={`${SCENES[sceneIdx].gifUrl}-${playCount}`}
          src={SCENES[sceneIdx].gifUrl}
          alt={SCENES[sceneIdx].title}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ imageRendering: 'auto' }}
        />
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
      <div className="relative z-10 w-full max-w-sm rounded-3xl overflow-hidden bg-slate-950/35 backdrop-blur-[2px] border border-white/25 p-7 shadow-2xl space-y-5 text-white">
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
