-- Phase 11: deployment lifecycle, versions, environments and domains
create table if not exists bot_versions (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references bots(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  version_number int not null,
  snapshot jsonb not null,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  unique(bot_id, version_number)
);

create table if not exists bot_deployments (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references bots(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  environment text not null check (environment in ('staging','production')),
  version_id uuid references bot_versions(id) on delete set null,
  status text not null default 'active' check (status in ('active','rolled_back','disabled')),
  deployed_by uuid references users(id),
  deployed_at timestamptz default now(),
  rolled_back_at timestamptz
);

create table if not exists bot_domains (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references bots(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  hostname text not null,
  type text not null default 'custom' check (type in ('custom','subdomain')),
  status text not null default 'pending' check (status in ('pending','verified','disabled')),
  verification_token text not null,
  created_at timestamptz default now(),
  verified_at timestamptz,
  unique(workspace_id, hostname)
);

create index if not exists bot_versions_bot_idx on bot_versions(bot_id, version_number desc);
create index if not exists bot_deployments_bot_env_idx on bot_deployments(bot_id, environment, deployed_at desc);
create index if not exists bot_domains_bot_idx on bot_domains(bot_id, status);

alter table bot_versions enable row level security;
alter table bot_deployments enable row level security;
alter table bot_domains enable row level security;

create policy "workspace members can read bot versions" on bot_versions for select using (is_workspace_member(workspace_id));
create policy "workspace editors can insert bot versions" on bot_versions for insert with check (is_workspace_member(workspace_id));
create policy "workspace members can read deployments" on bot_deployments for select using (is_workspace_member(workspace_id));
create policy "workspace editors can manage deployments" on bot_deployments for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy "workspace members can read domains" on bot_domains for select using (is_workspace_member(workspace_id));
create policy "workspace editors can manage domains" on bot_domains for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
