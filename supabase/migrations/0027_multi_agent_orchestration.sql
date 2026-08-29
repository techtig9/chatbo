create table if not exists public.agent_orchestration_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  max_depth integer not null default 3 check (max_depth between 1 and 10),
  max_agents integer not null default 6 check (max_agents between 1 and 20),
  max_cost_usd numeric(12,4) not null default 2 check (max_cost_usd >= 0),
  allow_parallel boolean not null default true,
  allow_dynamic_selection boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, bot_id)
);

alter table public.agent_relationships add column if not exists priority integer not null default 100 check (priority between 1 and 1000);

create table if not exists public.multi_agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_bot_id uuid not null references public.bots(id) on delete cascade,
  task text not null,
  context jsonb not null default '{}'::jsonb,
  mode text not null default 'supervisor' check (mode in ('parallel','sequential','supervisor')),
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  plan jsonb not null default '[]'::jsonb,
  results jsonb not null default '{}'::jsonb,
  final_result jsonb,
  depth integer not null default 0,
  max_depth integer not null default 3,
  max_agents integer not null default 6,
  max_cost_usd numeric(12,4) not null default 2,
  total_cost_usd numeric(12,4) not null default 0,
  idempotency_key text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(workspace_id, idempotency_key)
);

create table if not exists public.multi_agent_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.multi_agent_runs(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  step_index integer not null,
  agent_id uuid not null references public.bots(id) on delete cascade,
  task text not null,
  depends_on jsonb not null default '[]'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  output jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  unique(run_id, step_index)
);

create index if not exists agent_orchestration_policies_workspace_idx on public.agent_orchestration_policies(workspace_id);
create index if not exists multi_agent_runs_workspace_idx on public.multi_agent_runs(workspace_id, created_at desc);
create index if not exists multi_agent_runs_source_idx on public.multi_agent_runs(source_bot_id, created_at desc);
create index if not exists multi_agent_run_steps_run_idx on public.multi_agent_run_steps(run_id, step_index);
alter table public.agent_orchestration_policies enable row level security;
alter table public.multi_agent_runs enable row level security;
alter table public.multi_agent_run_steps enable row level security;
drop policy if exists agent_orchestration_policies_workspace on public.agent_orchestration_policies;
create policy agent_orchestration_policies_workspace on public.agent_orchestration_policies for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists multi_agent_runs_workspace on public.multi_agent_runs;
create policy multi_agent_runs_workspace on public.multi_agent_runs for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists multi_agent_run_steps_workspace on public.multi_agent_run_steps;
create policy multi_agent_run_steps_workspace on public.multi_agent_run_steps for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
