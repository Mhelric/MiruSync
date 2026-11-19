import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Smartphone } from 'lucide-react';
import { AniListIcon, MalIcon, MiruSyncLogo } from '../components/BrandIcons';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: 'Your login session expired or was invalid. Please try again.',
  missing_code: 'Authorization was cancelled or missing a code.',
  token_exchange_failed: 'Could not exchange OAuth token with the provider.',
  profile_fetch_failed: 'Signed in, but could not load your user profile.',
  profile_missing: 'Provider did not return a valid user profile.',
};

interface SceneSlide {
  id: string;
  title: string;
  gifUrl: string;
  durationMs: number;
}

const SCENES: SceneSlide[] = [
  { id: 'frieren', title: "Frieren: Beyond Journey's End", gifUrl: '/scenes/frieren.gif', durationMs: 2200 },
  { id: 'onepiece', title: 'One Piece', gifUrl: '/scenes/onepiece.gif', durationMs: 4600 },
  { id: 'vinland', title: 'Vinland Saga', gifUrl: '/scenes/vinland.gif', durationMs: 1400 },
  { id: 'aot', title: 'Attack on Titan', gifUrl: '/scenes/aot.gif', durationMs: 5500 },
  { id: 'jjk', title: 'Jujutsu Kaisen', gifUrl: '/scenes/jjk.gif', durationMs: 7260 },
  { id: 'demonslayer', title: 'Demon Slayer', gifUrl: '/scenes/demonslayer.gif', durationMs: 3200 },
  { id: 'mha', title: 'My Hero Academia', gifUrl: '/scenes/mha.gif', durationMs: 1800 },
  { id: 'fmab', title: 'Fullmetal Alchemist: Brotherhood', gifUrl: '/scenes/fmab.gif', durationMs: 2500 },
  { id: 'blackclover', title: 'Black Clover', gifUrl: '/scenes/asta-swordofthewizardking.gif', durationMs: 4010 },
  { id: 'dandadan', title: 'Dandadan', gifUrl: '/scenes/dandadan.gif', durationMs: 5600 },
  { id: 'deku', title: 'Deku', gifUrl: '/scenes/deku-mha.gif', durationMs: 1560 },
  { id: 'drstone', title: 'Dr. Stone', gifUrl: '/scenes/dr-stone-tsukasa.gif', durationMs: 3810 },
  { id: 'gurrenlagann', title: 'Gurren Lagann', gifUrl: '/scenes/gurren-lagann-simon.gif', durationMs: 1900 },
  { id: 'haikyuu', title: 'Haikyu!!', gifUrl: '/scenes/haikyuu-anime.gif', durationMs: 2000 },
  { id: 'kiminitodoke', title: 'Kimi ni Todoke', gifUrl: '/scenes/hold-close-comfurt-anime.gif', durationMs: 1760 },
  { id: 'konosuba', title: 'KonoSuba', gifUrl: '/scenes/megumin-thumbs-up.gif', durationMs: 3000 },
  { id: 'naruto', title: 'Naruto & Sasuke', gifUrl: '/scenes/naruto-sasuke.gif', durationMs: 1600 },
  { id: 'sololeveling', title: 'Solo Leveling', gifUrl: '/scenes/solo-leveling-statue-smile-solo-leveling.gif', durationMs: 3100 },
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

const APK_DOWNLOAD_URL =
  'https://github.com/Mhelric/MiruSync/releases/latest/download/MiruSync.apk';

export function WelcomePage() {
  const [searchParams] = useSearchParams();
  const authError = searchParams.get('auth_error');

  const [queue, setQueue] = useState<number[]>(() => buildShuffledQueue(SCENES.length));
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [loaded, setLoaded] = useState(true);
  const [apkVersion, setApkVersion] = useState('1.2.39');
  const [connectingProvider, setConnectingProvider] = useState<'mal' | 'anilist' | null>(null);

  useEffect(() => {
    fetch('/api/app-version')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { version?: string } | null) => {
        if (data?.version) setApkVersion(data.version.replace(/^v/i, ''));
      })
      .catch(() => {});
  }, []);

  const activeIndex = queue[0] ?? 0;
  const nextIndex = queue[1] ?? 0;

  useEffect(() => {
    const preload = new Image();
    preload.src = SCENES[nextIndex].gifUrl;

    const duration = SCENES[activeIndex]?.durationMs ?? 3000;
    const timer = setTimeout(() => {
      setPrevIndex(activeIndex);
      setLoaded(false);
      setQueue((prev) => {
        const rest = prev.slice(1);
        return rest.length >= 2 ? rest : [...rest, ...buildShuffledQueue(SCENES.length, rest[0] ?? activeIndex)];
      });
      setPlayCount((c) => c + 1);
    }, duration);
    return () => clearTimeout(timer);
  }, [activeIndex, nextIndex, playCount]);

  function handleOAuthConnect(provider: 'mal' | 'anilist') {
    setConnectingProvider(provider);
    setTimeout(() => {
      window.location.href =
        provider === 'mal' ? '/api/auth-mal-start' : '/api/auth-al-start';
    }, 450);
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 p-6 overflow-hidden">
      {/* Animated 4-Anime Scene GIF Background Slideshow */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
        {prevIndex !== null && (
          <img
            src={SCENES[prevIndex].gifUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover scale-105"
          />
        )}
        <img
          key={`${SCENES[activeIndex].gifUrl}-${playCount}`}
          src={SCENES[activeIndex].gifUrl}
          alt={SCENES[activeIndex].title}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover scale-105 transition-opacity duration-700 ease-in-out ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Vignette & contrast gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at center, rgba(2,6,23,0.45) 0%, rgba(2,6,23,0.88) 78%, rgba(2,6,23,0.96) 100%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-md w-full flex flex-col gap-4">
        {/* Glassmorphism Sign-In Card */}
        <div className="w-full rounded-3xl overflow-hidden backdrop-blur-[2px] bg-slate-900/65 border border-white/15 p-8 shadow-2xl transition-colors duration-500">
          <div className="flex items-center gap-3 mb-5">
            <MiruSyncLogo className="h-10 w-10 shadow-lg shadow-sky-500/20" />
            <div className="text-xl font-bold tracking-tight text-white">
              Miru<span className="text-sky-400">Sync</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white">
            Track anime &amp; manga in one place.
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Sign in with MyAnimeList or AniList. Same fast experience across Desktop and Android, synced live.
          </p>

          {authError && (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/15 backdrop-blur px-3.5 py-2.5 text-xs text-rose-200">
              {AUTH_ERROR_MESSAGES[authError] ?? `Sign-in failed (${authError}).`}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={connectingProvider !== null}
              onClick={() => handleOAuthConnect('mal')}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.99] text-slate-950 font-semibold px-4 py-3 text-sm transition-all shadow-lg shadow-sky-500/20 cursor-pointer disabled:opacity-70"
            >
              <MalIcon className="h-5 w-5" />
              Continue with MyAnimeList
            </button>

            <button
              type="button"
              disabled={connectingProvider !== null}
              onClick={() => handleOAuthConnect('anilist')}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 active:scale-[0.99] text-white font-semibold px-4 py-3 text-sm transition-all cursor-pointer disabled:opacity-70"
            >
              <AniListIcon className="h-5 w-5" />
              Continue with AniList
            </button>
          </div>
        </div>

        {/* Separate Glassmorphism Download APK Box */}
        <div className="w-full rounded-2xl overflow-hidden backdrop-blur-md bg-slate-900/65 border border-white/15 p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center shrink-0">
                <Smartphone className="h-3.5 w-3.5 text-emerald-300" />
              </div>
              <span className="text-sm font-semibold text-white">
                MiruSync for Android
              </span>
            </div>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-400/25 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              v{apkVersion}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Take your list on the go with one-tap episode updates, offline tracking, and airing alerts.
          </p>
          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-medium px-4 py-2.5 text-xs transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Download Android APK
          </a>
        </div>
      </div>

      {/* Smooth Logging-In Transition Overlay */}
      {connectingProvider && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-2xl bg-slate-950/85">
          <div className="relative flex items-center justify-center">
            <div className="h-24 w-24 rounded-full border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
            <MiruSyncLogo className="h-12 w-12 absolute" />
          </div>
          <p className="mt-5 text-base font-semibold text-white">
            Connecting to {connectingProvider === 'mal' ? 'MyAnimeList' : 'AniList'}…
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Preparing your MiruSync workspace
          </p>
        </div>
      )}
    </main>
  );
}
