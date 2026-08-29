-- Phase 29 reliability foundation.
create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  key_hash text not null,
  operation text not null,
  response jsonb,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(workspace_id, key_hash, operation)
);
create index if not exists idempotency_expiry_idx on public.idempotency_keys(expires_at);

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','dead_letter','cancelled')),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists background_jobs_ready_idx on public.background_jobs(status, run_after);

create table if not exists public.provider_health_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  provider text not null,
  component text,
  status text not null check (status in ('healthy','degraded','open','recovered')),
  latency_ms integer,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists provider_health_idx on public.provider_health_events(provider, created_at desc);

alter table public.idempotency_keys enable row level security;
alter table public.background_jobs enable row level security;
alter table public.provider_health_events enable row level security;

drop policy if exists idempotency_workspace on public.idempotency_keys;
create policy idempotency_workspace on public.idempotency_keys for all using (workspace_id is null or is_workspace_member(workspace_id)) with check (workspace_id is null or is_workspace_member(workspace_id));
drop policy if exists jobs_workspace on public.background_jobs;
create policy jobs_workspace on public.background_jobs for all using (workspace_id is null or is_workspace_member(workspace_id)) with check (workspace_id is null or is_workspace_member(workspace_id));
drop policy if exists provider_health_workspace on public.provider_health_events;
create policy provider_health_workspace on public.provider_health_events for select using (workspace_id is null or is_workspace_member(workspace_id));
