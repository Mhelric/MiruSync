<div align="center">

# MiruSync

**One tracker. Three experiences. Perfectly in sync.**  
Track your **Anime & Manga** across **Desktop Web**, **Mobile Web**, and the native **Android App** with **MyAnimeList** or **AniList** OAuth, offline-first queueing, live Supabase sync, and automatic APK updates.

<p>
  <a href="https://mirusync.vercel.app">
    <img src="https://img.shields.io/badge/Open_Web_App-mirusync.vercel.app-0ea5e9?style=for-the-badge&logo=vercel&logoColor=white" alt="Open Web App" />
  </a>
  <a href="https://github.com/Mhelric/MiruSync/releases/latest/download/MiruSync.apk">
    <img src="https://img.shields.io/badge/Download_Latest_APK-MiruSync.apk-10b981?style=for-the-badge&logo=android&logoColor=white" alt="Download Latest Android APK" />
  </a>
</p>

<p>
  <img src="https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Capacitor_Android-119EFF?style=flat-square&logo=capacitor&logoColor=white" alt="Capacitor Android" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
</p>

</div>

---

## Download & Live App

| Platform | Link | Notes |
| :--- | :--- | :--- |
| **Android APK (Latest Build)** | [**Download MiruSync.apk**](https://github.com/Mhelric/MiruSync/releases/latest/download/MiruSync.apk) | Signed release build — updates in-place automatically without package conflicts |
| **Desktop & Mobile Web** | [**mirusync.vercel.app**](https://mirusync.vercel.app) | Responsive web app with instant `Ctrl+K` / mobile search and PWA support |
| **All APK Releases** | [**GitHub Releases**](https://github.com/Mhelric/MiruSync/releases) | Full release history and build notes |

---

## Features

- **Unified MAL & AniList OAuth:** Sign in with **MyAnimeList** (OAuth2 + PKCE) or **AniList** via official OAuth, with a full-screen animated anime scene sign-in experience.
- **Native-Style Android App & Responsive Web:**
  - Floating glassmorphic bottom dock, touch-swipable **Trending Hero**, **Ambient Aurora Greeting Card**, and horizontal **Continue Watching / Reading** & **Airing Soon** rails.
  - **Anime & Manga Trackers:** Grid, List, and Compact modes, status tabs, smooth expanding filters (Format, Genre, Sort), one-tap `+1` progress updates, and an Edit Entry sheet.
  - **Rich Media Details:** Trailers, Rankings, Genres, collapsible Synopsis / Alternative Titles / Tags / Streaming Links, plus horizontal carousels for **Relations**, **Characters & Voice Actors** (with *View All* modals), and **Recommendations**.
- **Discover, Schedule & News:**
  - **Popular** (Trending, This Season, Upcoming, Top Rated, All Time) and **New Releases** (Just Aired, This Season, Recently Added).
  - **Release Calendar:** Local-timezone airing schedule starting from **Today**.
  - **Full Search:** Persistent search filters (Title, Genre, Tag, Format, Status, Min Score, Season, Year, Sort, 18+ toggle, and Recent Searches) that stay intact when navigating back from a title.
  - **Anime News:** Fast cached RSS feed with thumbnails.
- **Profile, Themes & Customization:**
  - GitHub-style activity heatmap, Favorites, Recent Activity, and **Dark / Light** mode (with adaptive white `MS` logo & white-frosted glassmorphism) + 5 Accent Colors (`Sky`, `Indigo`, `Emerald`, `Rose`, `Amber`), Corner Style, and Text Size.
- **Android Native Extras:**
  - **Airing Today Home-Screen Widget** & **Capacitor Local Notifications**.
  - **In-App Updater:** Background & resume version checks with a clickable top banner and **Update Available** modal, plus Android back-button exit confirmation.
- **Offline-First Queue & Privacy:** Local IndexedDB (Dexie) cache with automatic replay on reconnect, JSON / MAL XML backup import & export, and one-click **Delete Cloud Data**.

---

## Update Logs

### Latest Updates (`2026-11-19`)
- **Home & Schedule Polish (`42362f2`):** Added animated **Ambient Aurora** greeting card (time-of-day greeting + accent glow) across Android App and Web; sorted Android **Schedule** tab to always start on **Today**.
- **Persistent Discover Search (`ee9f130`):** Saved active Search filters (`query`, `genre`, `tag`, `format`, `status`, `minScore`, `season`, `year`, `sort`, `18+`) in `sessionStorage` so navigating back from a title no longer resets your search.
- **Android UI & Navigation Polish (`9590801`, `101540b`):**
  - Full-screen crisp unblurred anime scene GIFs on Sign-In with translucent glassmorphism, adaptive white `MS` logo in light mode, and white-frosted glass UI overrides.
  - Lowered & enlarged floating bottom nav dock, made all 5 Discover tabs (`Popular`, `New`, `Schedule`, `Search`, `News`) fit on-screen without scrolling, added smooth CSS Grid accordion animations, and added idle icon animations (`Tv`, `BookOpen`, `Clock`).
  - Added Desktop-style **Quick Search** modal + full Discover Search filters, moved **Sign Out** to Settings, and added **Corner Style** & **Text Size** appearance customization.
- **Background Updater & Exit Confirmation (`a684dbf`, `fc5ba1a`, `39f38b9`):**
  - Added foreground/resume & background polling for new APK releases with a persistent clickable head banner and dynamic git-commit release notes.
  - Added Android hardware/gesture **Back** button **Exit MiruSync?** confirmation modal on main tabs.
- **Android Native App Overhaul (`8be6e6d`, `5413be5`):**
  - Replaced the basic Konsta skeleton with a bespoke native-style MiruSync Android UI, swipeable hero, horizontal rails, `MobileMediaDetailPage`, and `MobileSettingsPage`.
- **Android OAuth & Persistent APK Signing (`9e104e9`, `c3ac935`, `0f47aa5`):**
  - Added CORS preflight (`OPTIONS`) & `Access-Control-Allow-*` headers in `api/[route].ts` for Capacitor WebView (`https://localhost`) API calls.
  - Added Android 11+ `<queries>` for Chrome Custom Tabs in `AndroidManifest.xml` and fallback browser launch.
  - Configured persistent RSA release keystore signing + auto-incrementing `versionCode` in GitHub Actions (`release-apk.yml`) so APK updates install cleanly in-place without package conflicts.

### Previous Milestones (`2026-11-18`)
- **Mobile Web & Media Detail Overhaul (`e1ba698`, `c6e2dd5`, `c7d297e`):**
  - Redesigned `MediaDetailPage` mobile layout with overlapping poster header, inline tracking bar, collapsible synopsis/tags/links, and *View All* modals for Relations & Characters.
  - Added **Tag** search filter, fixed mobile Notifications dropdown bounds, enlarged Home greeting, and expanded Mean Score full-width on mobile Profile.
- **Vercel Migration & Blueprint Completion:**
  - Migrated serverless API hosting to **Vercel** (`vercel.json` + `api/[route].ts`) with fast `/api/news` caching, New Releases, Upcoming/Top Rated Popular tabs, Accent Colors, Shorten Long Titles, and MAL XML / JSON import.

---

## Monorepo Architecture

```text
mirusync/
├─ api/
│  └─ [route].ts            # Vercel serverless API router with CORS + preflight handling
├─ apps/
│  ├─ web/                  # Desktop & Mobile Web UI (Vite + React 19 + Tailwind CSS v4)
│  └─ mobile/               # Android App (Capacitor 7 + React 19 + Tailwind CSS v4 + AiringTodayWidget)
├─ packages/
│  └─ core/                 # Shared AniList/MAL providers, TanStack Query hooks, Dexie DB, Supabase sync
├─ netlify/
│  └─ functions/            # Shared serverless handlers (OAuth, JWT minting, mal-proxy, schedule, news, app-version)
├─ supabase/
│  └─ schema.sql            # Postgres tables, RLS policies, and Realtime publication
└─ .github/workflows/
   └─ release-apk.yml       # Automated signed Android Release APK builder & GitHub Release publisher
```

---

## Local Setup & Building

### 1. Prerequisites
- **Node.js** `>= 20`
- **pnpm** `>= 9` (`npm install -g pnpm`)
- **Android Studio / Java 21** (only needed for local Android APK builds)

### 2. Install & Configure
```bash
pnpm install
```
Copy `.env.example` to `.env` and configure your **MyAnimeList**, **AniList**, **Supabase**, and `SESSION_SECRET` credentials.

### 3. Typecheck & Production Builds
```bash
# Typecheck all packages & apps
pnpm typecheck

# Build Web App (apps/web)
pnpm build:web

# Build & Sync Android App (apps/mobile)
pnpm build:mobile
pnpm --filter @mirusync/mobile cap:sync
```
