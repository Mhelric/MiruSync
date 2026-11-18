import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { AniListIcon, MalIcon, MiruSyncLogo } from '../components/BrandIcons';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: 'Your login session expired or was invalid. Please try again.',
  missing_code: 'Authorization was cancelled or missing a code.',
  token_exchange_failed: 'Could not exchange OAuth token with the provider.',
  profile_fetch_failed: 'Signed in, but could not load your user profile.',
  profile_missing: 'Provider did not return a valid user profile.',
};

interface SceneSlide {
  id: number;
  title: string;
  imageUrl: string;
}

const DEFAULT_SCENES: SceneSlide[] = [
  {
    id: 154587,
    title: "Frieren: Beyond Journey's End",
    imageUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg',
  },
  {
    id: 21,
    title: 'One Piece',
    imageUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZqs.jpg',
  },
  {
    id: 101348,
    title: 'Vinland Saga',
    imageUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101348-3j6t5p22m8A6.jpg',
  },
  {
    id: 20,
    title: 'Naruto',
    imageUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20-HHxhPj5Oj53a.jpg',
  },
];

const APK_DOWNLOAD_URL =
  'https://github.com/Mhelric/MiruSync/releases/latest/download/MiruSync.apk';

export function WelcomePage() {
  const [searchParams] = useSearchParams();
  const authError = searchParams.get('auth_error');

  const [scenes, setScenes] = useState<SceneSlide[]>(DEFAULT_SCENES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [connectingProvider, setConnectingProvider] = useState<'mal' | 'anilist' | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            Page(page: 1, perPage: 4) {
              media(id_in: [154587, 21, 101348, 20], type: ANIME) {
                id
                title { english romaji }
                bannerImage
                coverImage { extraLarge }
              }
            }
          }
        `,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const list = json?.data?.Page?.media as
          | Array<{
              id: number;
              title?: { english?: string; romaji?: string };
              bannerImage?: string;
              coverImage?: { extraLarge?: string };
            }>
          | undefined;
        if (!cancelled && list?.length) {
          const order = [154587, 21, 101348, 20];
          const mapped = order
            .map((id) => list.find((m) => m.id === id))
            .filter(Boolean)
            .map((m) => ({
              id: m!.id,
              title: m!.title?.english || m!.title?.romaji || 'Anime',
              imageUrl: m!.bannerImage || m!.coverImage?.extraLarge || '',
            }))
            .filter((s) => s.imageUrl);
          if (mapped.length > 0) setScenes(mapped);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % scenes.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [scenes.length]);

  function handleOAuthConnect(provider: 'mal' | 'anilist') {
    setConnectingProvider(provider);
    setTimeout(() => {
      window.location.href =
        provider === 'mal' ? '/api/auth-mal-start' : '/api/auth-al-start';
    }, 450);
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 p-6 overflow-hidden">
      {/* Animated 4-Anime Background Slideshow */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
        {scenes.map((scene, idx) => (
          <div
            key={scene.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={scene.imageUrl}
              alt={scene.title}
              className={`h-full w-full object-cover blur-[3px] scale-105 ${
                idx === activeIndex ? 'animate-ken-burns' : ''
              }`}
            />
          </div>
        ))}
        {/* Vignette & contrast gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at center, rgba(2,6,23,0.48) 0%, rgba(2,6,23,0.88) 78%, rgba(2,6,23,0.96) 100%)',
          }}
        />
      </div>

      {/* Bottom-left Scene Indicator Pill */}
      <div className="fixed bottom-5 left-5 z-10 hidden sm:flex items-center gap-3 rounded-full backdrop-blur-xl bg-slate-900/55 border border-white/10 px-4 py-2 text-xs text-slate-200 shadow-lg">
        <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
        <span className="text-slate-400">Now showing:</span>
        <span className="font-medium text-slate-100">
          {scenes[activeIndex]?.title}
        </span>
        <div className="flex items-center gap-1.5 ml-1">
          {scenes.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Show ${s.title}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === activeIndex
                  ? 'w-4 bg-sky-400'
                  : 'w-1.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Glassmorphism Sign-In Card */}
      <div className="relative z-10 max-w-md w-full rounded-3xl backdrop-blur-2xl bg-slate-900/45 border border-white/15 p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] transition-all duration-500">
        <div className="flex items-center gap-3 mb-5">
          <MiruSyncLogo className="h-11 w-11 shadow-lg shadow-sky-500/20" />
          <div>
            <div className="text-lg font-bold tracking-tight text-white">
              Miru<span className="text-sky-400">Sync</span>
            </div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-sky-300/80">
              Unified Tracker
            </div>
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

        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Live device sync</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span>Official OAuth2</span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/privacy"
            className="text-[11px] text-slate-400 hover:text-white underline transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>

      {/* Smooth Logging-In Transition Overlay */}
      {connectingProvider && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-2xl bg-slate-950/85 animate-fade-in">
          <div className="relative flex items-center justify-center">
            <div className="h-24 w-24 rounded-full border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
            <MiruSyncLogo className="h-12 w-12 absolute" />
          </div>
          <p className="mt-5 text-base font-semibold text-white">
            Connecting to {connectingProvider === 'mal' ? 'MyAnimeList' : 'AniList'}…
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Preparing your unified MiruSync workspace
          </p>
        </div>
      )}
    </main>
  );
}
