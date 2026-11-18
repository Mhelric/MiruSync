import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
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
}

const SCENES: SceneSlide[] = [
  {
    id: 'frieren',
    title: "Frieren: Beyond Journey's End",
    gifUrl: '/scenes/frieren.gif',
  },
  {
    id: 'onepiece',
    title: 'One Piece',
    gifUrl: '/scenes/onepiece.gif',
  },
  {
    id: 'vinland',
    title: 'Vinland Saga',
    gifUrl: '/scenes/vinland.gif',
  },
  {
    id: 'naruto',
    title: 'Naruto',
    gifUrl: '/scenes/naruto.gif',
  },
  {
    id: 'aot',
    title: 'Attack on Titan',
    gifUrl: '/scenes/aot.gif',
  },
  {
    id: 'jjk',
    title: 'Jujutsu Kaisen',
    gifUrl: '/scenes/jjk.gif',
  },
  {
    id: 'demonslayer',
    title: 'Demon Slayer',
    gifUrl: '/scenes/demonslayer.gif',
  },
  {
    id: 'fmab',
    title: 'Fullmetal Alchemist: Brotherhood',
    gifUrl: '/scenes/fmab.gif',
  },
  {
    id: 'sololeveling',
    title: 'Solo Leveling',
    gifUrl: '/scenes/sololeveling.gif',
  },
];

const APK_DOWNLOAD_URL =
  'https://github.com/Mhelric/MiruSync/releases/latest/download/MiruSync.apk';

export function WelcomePage() {
  const [searchParams] = useSearchParams();
  const authError = searchParams.get('auth_error');

  const [activeIndex, setActiveIndex] = useState(0);
  const [connectingProvider, setConnectingProvider] = useState<'mal' | 'anilist' | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SCENES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

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
        {SCENES.map((scene, idx) => (
          <div
            key={scene.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={scene.gifUrl}
              alt={scene.title}
              className="h-full w-full object-cover blur-[3px] scale-105"
            />
          </div>
        ))}
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
        <div className="w-full rounded-3xl backdrop-blur-2xl bg-slate-900/45 border border-white/15 p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] transition-all duration-500">
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
        <div className="w-full rounded-2xl backdrop-blur-2xl bg-slate-900/45 border border-white/15 p-4 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)]">
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
