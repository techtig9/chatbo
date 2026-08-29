-- Phase 25 — advanced analytics, saved dashboards and report definitions.
create table if not exists analytics_dashboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  description text,
  layout jsonb not null default '[]'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists analytics_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  schedule text,
  recipients text[] not null default '{}',
  metrics text[] not null default '{}',
  filters jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  last_run_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_analytics_dashboards_workspace on analytics_dashboards(workspace_id, created_at desc);
create index if not exists idx_analytics_reports_workspace on analytics_reports(workspace_id, created_at desc);

alter table analytics_dashboards enable row level security;
alter table analytics_reports enable row level security;

create policy "workspace members can read analytics dashboards" on analytics_dashboards for select using (is_workspace_member(workspace_id));
create policy "workspace editors can manage analytics dashboards" on analytics_dashboards for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy "workspace members can read analytics reports" on analytics_reports for select using (is_workspace_member(workspace_id));
create policy "workspace editors can manage analytics reports" on analytics_reports for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
