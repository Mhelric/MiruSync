-- MiruSync Supabase Schema (Phase 1)
-- Run this in your Supabase SQL Editor.

create table if not exists public.users (
  id text primary key, -- e.g. "mal:12345" or "al:67890"
  provider text not null check (provider in ('mal', 'anilist')),
  provider_user_id text not null,
  username text not null,
  avatar_url text,
  score_format text not null default 'POINT_10',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id text primary key references public.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('light', 'dark', 'system')),
  accent_color text not null default 'sky',
  title_language text not null default 'romaji' check (title_language in ('romaji', 'english', 'native')),
  list_layout text not null default 'grid' check (list_layout in ('grid', 'list', 'compact')),
  compact_mode boolean not null default false,
  show_adult boolean not null default false,
  spoiler_blur boolean not null default true,
  notifications_enabled boolean not null default true,
  quiet_hours jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  platform text not null check (platform in ('android', 'web')),
  token_or_subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row-Level Security
alter table public.users enable row level security;
alter table public.user_settings enable row level security;
alter table public.push_subscriptions enable row level security;

-- RLS Policies (matching custom Supabase JWT `sub` claim via auth.uid()::text)
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid()::text = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid()::text = id);

create policy "Users can delete own profile"
  on public.users for delete
  using (auth.uid()::text = id);

create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid()::text = user_id);

create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- Enable Realtime for live cross-device settings sync
alter publication supabase_realtime add table public.user_settings;
