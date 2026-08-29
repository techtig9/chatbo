create table if not exists public.workflow_approvals (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  node_id text not null,
  title text not null,
  description text,
  action_type text not null default 'workflow_action',
  requested_by uuid references auth.users(id) on delete set null,
  approver_role text not null default 'admin' check (approver_role in ('owner','admin','editor')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired','cancelled')),
  payload jsonb not null default '{}'::jsonb,
  decision_comment text,
  decided_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  expires_at timestamptz,
  decided_at timestamptz
);
create index if not exists workflow_approvals_workspace_idx on public.workflow_approvals(workspace_id, status, requested_at desc);
create index if not exists workflow_approvals_run_idx on public.workflow_approvals(workflow_run_id, requested_at asc);
create index if not exists workflow_approvals_pending_role_idx on public.workflow_approvals(workspace_id, approver_role, status);
alter table public.workflow_approvals enable row level security;
create policy workflow_approvals_member_select on public.workflow_approvals for select using (public.is_workspace_member(workspace_id));
create policy workflow_approvals_member_insert on public.workflow_approvals for insert with check (public.is_workspace_member(workspace_id));
create policy workflow_approvals_member_update on public.workflow_approvals for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
alter table public.workflow_runs drop constraint if exists workflow_runs_status_check;
alter table public.workflow_runs add constraint workflow_runs_status_check check (status in ('queued','running','awaiting_approval','succeeded','failed','cancelled'));
