# MiruSync — Finalized Project Blueprint v2.0

> One tracker. Two platforms. Perfectly in sync.  
> Sign in with **MyAnimeList** or **AniList**, get the exact same experience on Desktop Web and Android, with live cross-device sync and push notifications.

**Deliverables:** Android App (Google Play Store + APK) & Desktop Website  
**Hosting & Backend:** Netlify (Static Site + Netlify Functions) · Supabase (Postgres + Realtime) · FCM & Web Push  
**Stack:** pnpm Workspaces · TypeScript · React · Tailwind CSS · Vite · shadcn/ui (Web) · Konsta UI + Capacitor (Android)

---

## 1. Core Decisions & Product Principles

1. **Single-Provider Login (MAL *or* AniList):** Users sign in with either MyAnimeList or AniList. There is no two-account linking or MAL↔AniList conflict resolution—users pick their preferred list provider and get a unified, provider-agnostic UI.
2. **Auth-Gated Entry (No Guest Mode):** Users sign in at the Welcome screen before accessing the app.
3. **Live Cross-Device Sync:** Settings, preferences, followed titles, and notification read/unread states sync in real time between Desktop Web and Android via **Supabase Realtime**.
4. **Server-Side Push Notifications:** Episode airing alerts, manga chapter updates, and news alerts are delivered even when the app is closed via **FCM** (Android) and **Web Push** (Desktop).
5. **Google Play Store Ready from Day 1:** Strict adult/NSFW content gating (hidden by default), hosted Privacy Policy (`/privacy`), and an in-app Delete Account / Clear Data flow for Supabase data.

---

## 2. Monorepo Architecture (`pnpm` Workspaces)

```
mirusync/
├─ apps/
│  ├─ web/                  # Desktop UI (Vite + React + Tailwind + shadcn/ui)
│  │  └─ src/{pages,layouts,components}
│  └─ mobile/               # Mobile UI (Vite + React + Tailwind + Konsta UI + Capacitor)
│     ├─ src/{pages,layouts,components}
│     └─ android/           # Generated Capacitor Android project
├─ packages/
│  └─ core/
│     └─ src/
│        ├─ providers/      # MediaProvider interface, MalProvider, AniListProvider
│        ├─ supabase/       # Supabase client, Realtime hooks, user settings/sync
│        ├─ hooks/          # useList, useSearch, useSchedule, useNews, useNotifications
│        ├─ storage/        # Dexie (IndexedDB) offline cache & edit queue, token storage
│        └─ utils/          # Score conversion, timezone formatters, idMal mapping
├─ netlify/
│  └─ functions/            # OAuth, custom Supabase JWT minting, mal-proxy, news, schedule, cron-notify
├─ netlify.toml
├─ pnpm-workspace.yaml
└─ package.json
```

---

## 3. Authentication & Supabase Session Flow

Since users sign in **only** with MAL or AniList (no separate email/password), Netlify Functions bridge OAuth and Supabase:

1. **OAuth Login:**
   - **Web:** Redirects to MAL (OAuth2 + PKCE) or AniList (OAuth2). Callback hits a Netlify Function (`auth-mal-callback` / `auth-al-callback`).
   - **Android:** Opens system browser via `@capacitor/browser`, catches `mirusync://auth/callback` via deep link, and exchanges the code via the Netlify Function.
2. **Custom Supabase JWT:**
   - The Netlify Function upserts the user in Supabase keyed by `provider:provider_user_id` (e.g. `mal:12345` or `al:67890`).
   - It mints a **custom Supabase JWT** signed with `SUPABASE_JWT_SECRET` so Supabase Row-Level Security (`auth.uid()`) and **Supabase Realtime** work natively on the client.
3. **Token Storage:**
   - **Web:** Provider tokens stored securely (httpOnly cookie / encrypted session); Supabase JWT in memory/session.
   - **Android:** Tokens stored in Android Keystore via Capacitor Secure Storage.

---

## 4. Data Sources & Provider Abstraction

| Data | Source | Notes |
|---|---|---|
| **User Lists, Progress, Scores, Profile** | Signed-in provider (`MalProvider` or `AniListProvider`) | Normalized into unified `Media`, `ListEntry`, and `AppUser` types |
| **Popular / Trending / Seasonal** | AniList GraphQL (public) | Unified discovery experience regardless of login |
| **Release Schedule (Airing Times)** | AniList `airingSchedules` | Mapped to MAL entries via `idMal` so MAL users get exact airing countdowns |
| **Anime News** | **ANN RSS + Jikan API** | Parsed & cached (15–30 min) by `news` Netlify Function; includes list-aware "For You" picks |
| **New Manga Chapters** | **MangaDex API** | Matches manga titles to surface new chapter alerts |
| **Settings, Push Tokens & Notifications** | **Supabase (Postgres + Realtime)** | Live-synced across Desktop Web and Android |

---

## 5. Feature Map

### Core Screens
- **Welcome / Onboarding:** Intro slides + `Continue with MyAnimeList` / `Continue with AniList`.
- **Home Dashboard:** Quick stats, Continue Watching/Reading (`+1` button), Airing Today, Notifications preview, Trending & New Releases carousels.
- **Anime & Manga Trackers:** Status tabs (`Watching/Reading`, `Completed`, `Plan to Watch/Read`, `On Hold`, `Dropped`), filters, list/grid views, optimistic `+1` progress updates, and Edit sheet.
- **Title Detail Page:** Synopsis, genres, score, episode/chapter progress, trailer, relations, streaming links, and follow/bell toggle.
- **Search:** Anime/Manga toggle, filters (genre, year, season, format, status, score), `Ctrl+K` command palette on Desktop.
- **Release Calendar:** Weekly schedule (Mon–Sun) in the user's local timezone; toggle `My List Only` vs `All Airing`; `.ics` calendar export.
- **Popular & New Releases:** Trending now, This season, Upcoming, All-time popular, Top rated, Just aired.
- **Anime News:** Aggregated ANN RSS + Jikan feed with list-aware filtering and external article links.
- **Profile:** Avatar, stats (episodes watched, days, mean score, chapters read), charts (Recharts), favorites, recent activity.
- **Notifications:** In-app notification center + **FCM** (Android) & **Web Push** (Desktop) for new episodes, new manga chapters, and season premieres.
- **Settings:** Appearance (Light/Dark/System, accent color, compact/grid modes), Title language (Romaji/English/Native), Score format, Notifications & quiet hours, NSFW toggle (strictly off by default), Privacy Policy (`/privacy`), Export backup, and **Delete Account / Clear Data**.

---

## 6. Two UIs, One Shared Core

| Aspect | Desktop Web (`apps/web`) | Android App (`apps/mobile`) |
|---|---|---|
| **UI Library** | **shadcn/ui** + Tailwind CSS | **Konsta UI** (Material/Android) + Tailwind CSS |
| **Navigation** | Left sidebar + top `Ctrl+K` search bar | Bottom tab bar (`Home`, `Anime`, `Manga`, `Discover`, `Profile`) |
| **List View** | Data tables or multi-column poster grids | Touch cards, swipe actions, `+1` button |
| **Calendar** | 7-column weekly grid | Day tabs with vertical list |
| **Notifications** | In-app panel + Web Push | In-app panel + FCM Push Notifications |

---

## 7. Build Roadmap

| Phase | Goal | Done When |
|---|---|---|
| **0. Setup** | `pnpm` monorepo, Tailwind, Netlify site, Supabase project, MAL + AniList OAuth apps | Hello-world deployed on Netlify |
| **1. Auth & Supabase JWT** | MAL & AniList OAuth via Netlify Functions + custom Supabase JWT minting | `getCurrentUser()` + Supabase RLS session work on Web |
| **2. Core Tracker** | `MalProvider` & `AniListProvider`, list UI, detail page, `+1`, Edit sheet, Dexie offline queue | Can view and update real lists on Web |
| **3. Search & Discover** | Search (`Ctrl+K`), Popular, Seasonal, New Releases | Can search and add any title |
| **4. Calendar & News** | Weekly local-time schedule (`schedule` fn), ANN RSS + Jikan (`news` fn) | Accurate airing calendar & news feed |
| **5. Mobile Shell (APK)** | Capacitor + Konsta UI bottom-tab app, `mirusync://` deep-link OAuth, Android Keystore storage | Login & tracking work in Android APK |
| **6. Live Sync & Push** | Supabase Realtime settings sync, FCM + Web Push registration, `cron-notify` scheduled function, MangaDex chapter checks | Push notifications & live settings sync work across Web & Android |
| **7. Profile & Settings** | Stats charts, theming, title language, `/privacy` policy, Delete Account flow | Full customization & Play Store data compliance |
| **8. Play Store Polish** | Signed release AAB/APK, Play Console closed testing, store screenshots, README | Ready for Google Play Store submission & portfolio |

---

## 8. Google Play & Netlify Setup Checklist

- **Netlify Env Vars:** `MAL_CLIENT_ID`, `MAL_CLIENT_SECRET`, `AL_CLIENT_ID`, `AL_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `FCM_SERVICE_ACCOUNT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
- **Android Identifiers:** Package ID `com.yourname.mirusync` (or `io.mirusync.app`), Deep Link `mirusync://auth/callback`.
- **Play Store Compliance:** Adult/NSFW titles hidden by default, hosted `/privacy` page, in-app account/data deletion button in Settings.
