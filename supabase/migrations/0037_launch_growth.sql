-- Phase 30 launch, growth and SaaS optimization.
alter table public.workspaces add column if not exists trial_ends_at timestamptz;
alter table public.workspaces add column if not exists onboarding_completed_at timestamptz;
alter table public.workspaces add column if not exists referral_code text;
create unique index if not exists workspaces_referral_code_idx on public.workspaces(referral_code) where referral_code is not null;

create table if not exists public.growth_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists growth_events_workspace_idx on public.growth_events(workspace_id, created_at desc);
create index if not exists growth_events_event_idx on public.growth_events(event, created_at desc);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_workspace_id uuid references public.workspaces(id) on delete cascade not null,
  referred_email text,
  referred_workspace_id uuid references public.workspaces(id) on delete set null,
  code text not null,
  status text not null default 'invited' check (status in ('invited','signed_up','converted','rewarded','expired')),
  reward_cents integer not null default 0,
  created_at timestamptz not null default now(),
  converted_at timestamptz
);
create index if not exists referrals_workspace_idx on public.referrals(referrer_workspace_id, created_at desc);

create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rating integer check (rating between 1 and 5),
  category text not null default 'general',
  message text not null,
  page text,
  status text not null default 'new' check (status in ('new','reviewing','resolved','closed')),
  created_at timestamptz not null default now()
);
create index if not exists product_feedback_status_idx on public.product_feedback(status, created_at desc);

alter table public.growth_events enable row level security;
alter table public.referrals enable row level security;
alter table public.product_feedback enable row level security;
drop policy if exists growth_events_member on public.growth_events;
create policy growth_events_member on public.growth_events for insert with check (workspace_id is null or is_workspace_member(workspace_id));
drop policy if exists referrals_member on public.referrals;
create policy referrals_member on public.referrals for all using (is_workspace_member(referrer_workspace_id)) with check (is_workspace_member(referrer_workspace_id));
drop policy if exists feedback_member_insert on public.product_feedback;
create policy feedback_member_insert on public.product_feedback for insert with check (workspace_id is null or is_workspace_member(workspace_id));
drop policy if exists feedback_member_read on public.product_feedback;
create policy feedback_member_read on public.product_feedback for select using (workspace_id is null or is_workspace_member(workspace_id));
