create table if not exists public.agent_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_bot_id uuid not null references public.bots(id) on delete cascade,
  target_bot_id uuid not null references public.bots(id) on delete cascade,
  role text not null default 'specialist',
  enabled boolean not null default true,
  max_calls integer not null default 10 check (max_calls between 1 and 100),
  max_input_chars integer not null default 12000 check (max_input_chars between 100 and 50000),
  created_at timestamptz not null default now(),
  unique(workspace_id, source_bot_id, target_bot_id),
  check (source_bot_id <> target_bot_id)
);
create table if not exists public.agent_delegations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_bot_id uuid not null references public.bots(id) on delete cascade,
  target_bot_id uuid not null references public.bots(id) on delete cascade,
  task text not null,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists agent_relationships_workspace_idx on public.agent_relationships(workspace_id);
create index if not exists agent_relationships_source_idx on public.agent_relationships(source_bot_id);
create index if not exists agent_delegations_workspace_idx on public.agent_delegations(workspace_id, created_at desc);
create index if not exists agent_delegations_source_idx on public.agent_delegations(source_bot_id, created_at desc);
alter table public.agent_relationships enable row level security;
alter table public.agent_delegations enable row level security;
drop policy if exists agent_relationships_workspace on public.agent_relationships;
create policy agent_relationships_workspace on public.agent_relationships for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists agent_delegations_workspace on public.agent_delegations;
create policy agent_delegations_workspace on public.agent_delegations for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
