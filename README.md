# MiruSync

> **One tracker. Two platforms. Perfectly in sync.**  
> Sign in with **MyAnimeList** or **AniList** and get the exact same fast, modern experience on **Desktop Web** and **Android**, with live cross-device settings sync and push notifications.

---

## Features

- **Single-Provider, Unified Experience:** Sign in with MyAnimeList **or** AniList via official OAuth2 (+ PKCE for MAL). The UI and features stay identical regardless of provider.
- **Anime & Manga Trackers:** Status tabs, Grid/List views, sorting, instant `+1` progress updates, and a full Edit Entry modal (status, progress, volumes, score, dates, rewatches, notes).
- **Offline-First Queue:** Lists are cached locally in IndexedDB (Dexie). Edits made offline are queued and replayed automatically on reconnect.
- **Search & Discover:** Debounced search with genre/season/year filters, `Ctrl+K` global command-palette search on Desktop, and Popular / Seasonal / All-Time carousels.
- **Release Calendar & News:** Weekly airing schedule in your local timezone (with `.ics` calendar export) powered by AniList `airingSchedules`, plus an Anime News Network RSS feed with list-aware "For You" filtering.
- **Live Cross-Device Sync & Push Notifications:** Settings, preferences, and notification read states sync live via **Supabase Realtime** (using custom Supabase JWTs minted on OAuth login), with hourly episode checks (`cron-notify`), MangaDex chapter lookups, and Web Push / FCM support.
- **Google Play Store Ready:** Adult/NSFW content strictly hidden by default, public `/privacy` policy, JSON backup export, and in-app **Delete MiruSync Cloud Data**.

---

## Monorepo Architecture

```
mirusync/
├─ apps/
│  ├─ web/                  # Desktop Web UI (Vite + React + Tailwind CSS)
│  └─ mobile/               # Mobile UI (Vite + React + Tailwind + Konsta UI + Capacitor)
├─ packages/
│  └─ core/                 # Shared MediaProvider adapters, TanStack Query hooks, Dexie DB, Supabase client
├─ netlify/
│  └─ functions/            # OAuth handlers, custom Supabase JWT minting, mal-proxy, schedule, news, cron-notify
└─ supabase/
   └─ schema.sql            # Postgres tables, RLS policies, and Realtime publication
```

---

## Local Setup

### 1. Prerequisites
- **Node.js** `>= 20`
- **pnpm** `>= 9` (`npm install -g pnpm`)
- **Android Studio** (only required to build the Android APK / AAB)

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
- **MyAnimeList API:** Register at `https://myanimelist.net/apiconfig` (redirect URI: `http://localhost:8888/api/auth-mal-callback`)
- **AniList API:** Register at `https://anilist.co/settings/developer` (redirect URI: `http://localhost:8888/api/auth-al-callback`)
- **Supabase:** Create a project, run `supabase/schema.sql` in the SQL Editor, and copy your URL, anon key, service role key, and JWT secret.

### 4. Run Locally (with Netlify Functions)
```bash
npx netlify dev
```
This runs the Vite web app and `/api/*` Netlify Functions together on `http://localhost:8888`.

---

## Building for Production

### Desktop Web (Netlify)
```bash
pnpm typecheck
pnpm build:web
```
Connect the repository to Netlify (`netlify.toml` is pre-configured) and add the `.env` variables in **Site Settings → Environment Variables**.

### Android APK / Google Play (Capacitor)
1. Build the mobile web bundle and sync to Android:
   ```bash
   pnpm build:mobile
   pnpm --filter @mirusync/mobile cap:sync
   ```
2. Open the native Android project in Android Studio:
   ```bash
   npx cap open android
   ```
3. Build a debug `.apk` for sideloading or generate a signed `.aab` for Google Play Console.
