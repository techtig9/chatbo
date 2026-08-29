create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bot_id uuid references public.bots(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  trigger_type text not null default 'manual' check (trigger_type in ('manual','webhook','conversation','schedule')),
  trigger_config jsonb not null default '{}'::jsonb,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  trigger_type text not null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  current_node_id text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.workflow_runs(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  node_id text not null,
  node_type text not null,
  status text not null check (status in ('running','succeeded','failed','skipped')),
  input jsonb,
  output jsonb,
  error text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists workflows_workspace_idx on public.workflows(workspace_id, updated_at desc);
create index if not exists workflow_runs_workflow_idx on public.workflow_runs(workflow_id, created_at desc);
create index if not exists workflow_runs_workspace_idx on public.workflow_runs(workspace_id, created_at desc);
create index if not exists workflow_steps_run_idx on public.workflow_run_steps(run_id, created_at asc);

alter table public.workflows enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_run_steps enable row level security;

create policy workflows_member_select on public.workflows for select using (public.is_workspace_member(workspace_id));
create policy workflows_member_insert on public.workflows for insert with check (public.is_workspace_member(workspace_id));
create policy workflows_member_update on public.workflows for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy workflows_member_delete on public.workflows for delete using (public.is_workspace_member(workspace_id));
create policy workflow_runs_member_select on public.workflow_runs for select using (public.is_workspace_member(workspace_id));
create policy workflow_steps_member_select on public.workflow_run_steps for select using (public.is_workspace_member(workspace_id));
