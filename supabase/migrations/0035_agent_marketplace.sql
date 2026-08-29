-- Phase 28: Agent marketplace, templates, publishing, installs, reviews and licensing foundation.
create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  category text not null default 'general',
  tags text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  status text not null default 'draft' check (status in ('draft','pending_review','published','rejected','archived')),
  pricing_type text not null default 'free' check (pricing_type in ('free','paid')),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD',
  license text not null default 'standard' check (license in ('standard','commercial','custom')),
  creator_name text,
  creator_avatar_url text,
  icon_url text,
  screenshots jsonb not null default '[]'::jsonb,
  requirements jsonb not null default '{}'::jsonb,
  security_scan_status text not null default 'pending' check (security_scan_status in ('pending','passed','failed','manual_review')),
  security_scan_report jsonb not null default '{}'::jsonb,
  installs_count integer not null default 0 check (installs_count >= 0),
  rating_average numeric(3,2) not null default 0,
  rating_count integer not null default 0 check (rating_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, bot_id)
);

create table if not exists public.marketplace_versions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  version text not null,
  manifest jsonb not null default '{}'::jsonb,
  changelog text not null default '',
  checksum text not null,
  created_at timestamptz not null default now(),
  unique(listing_id, version)
);

create table if not exists public.marketplace_installs (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  target_workspace_id uuid not null references public.workspaces(id) on delete cascade,
  installed_by uuid not null references auth.users(id) on delete cascade,
  version_id uuid references public.marketplace_versions(id),
  status text not null default 'installed' check (status in ('installed','updating','failed','removed')),
  installed_bot_id uuid references public.bots(id) on delete set null,
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(listing_id, target_workspace_id)
);

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '',
  status text not null default 'published' check (status in ('published','hidden','flagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(listing_id, user_id)
);

create table if not exists public.marketplace_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists marketplace_listings_discovery_idx on public.marketplace_listings(status, visibility, category, installs_count desc, rating_average desc);
create index if not exists marketplace_versions_listing_idx on public.marketplace_versions(listing_id, created_at desc);
create index if not exists marketplace_installs_workspace_idx on public.marketplace_installs(target_workspace_id, updated_at desc);
create index if not exists marketplace_reviews_listing_idx on public.marketplace_reviews(listing_id, status, created_at desc);
create index if not exists marketplace_reports_status_idx on public.marketplace_reports(status, created_at desc);

alter table public.marketplace_listings enable row level security;
alter table public.marketplace_versions enable row level security;
alter table public.marketplace_installs enable row level security;
alter table public.marketplace_reviews enable row level security;
alter table public.marketplace_reports enable row level security;

drop policy if exists marketplace_public_read on public.marketplace_listings;
create policy marketplace_public_read on public.marketplace_listings for select using (
  (visibility in ('public','unlisted') and status = 'published') or is_workspace_member(workspace_id)
);
drop policy if exists marketplace_versions_read on public.marketplace_versions;
create policy marketplace_versions_read on public.marketplace_versions for select using (
  exists (select 1 from public.marketplace_listings l where l.id = listing_id and ((l.visibility in ('public','unlisted') and l.status = 'published') or is_workspace_member(l.workspace_id)))
);
drop policy if exists marketplace_installs_member on public.marketplace_installs;
create policy marketplace_installs_member on public.marketplace_installs for all using (is_workspace_member(target_workspace_id)) with check (is_workspace_member(target_workspace_id));
drop policy if exists marketplace_reviews_read on public.marketplace_reviews;
create policy marketplace_reviews_read on public.marketplace_reviews for select using (
  status = 'published' or is_workspace_member(workspace_id)
);
drop policy if exists marketplace_reviews_write on public.marketplace_reviews;
create policy marketplace_reviews_write on public.marketplace_reviews for insert with check (auth.uid() = user_id and is_workspace_member(workspace_id));
drop policy if exists marketplace_reports_member on public.marketplace_reports;
create policy marketplace_reports_member on public.marketplace_reports for all using (auth.uid() = reporter_id) with check (auth.uid() = reporter_id);

-- Template manifest is intentionally metadata-only. Secrets, OAuth tokens and private knowledge contents are never copied into it.

drop policy if exists marketplace_listings_owner_write on public.marketplace_listings;
create policy marketplace_listings_owner_write on public.marketplace_listings for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists marketplace_versions_owner_write on public.marketplace_versions;
create policy marketplace_versions_owner_write on public.marketplace_versions for all using (
  exists (select 1 from public.marketplace_listings l where l.id = listing_id and is_workspace_member(l.workspace_id))
) with check (
  exists (select 1 from public.marketplace_listings l where l.id = listing_id and is_workspace_member(l.workspace_id))
);
drop policy if exists marketplace_reports_insert on public.marketplace_reports;
create policy marketplace_reports_insert on public.marketplace_reports for insert with check (auth.uid() = reporter_id);

create or replace function public.increment_marketplace_installs(p_listing_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.marketplace_listings set installs_count = installs_count + 1, updated_at = now() where id = p_listing_id;
$$;
revoke all on function public.increment_marketplace_installs(uuid) from public;
grant execute on function public.increment_marketplace_installs(uuid) to authenticated;
