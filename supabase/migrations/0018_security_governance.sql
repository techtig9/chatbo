-- Phase 10 — runtime security, guardrails and governance audit trail
create table if not exists security_incidents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  bot_id uuid references bots(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  request_id text,
  code text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_security_incidents_workspace on security_incidents(workspace_id, created_at desc);
create index if not exists idx_security_incidents_bot on security_incidents(bot_id, created_at desc);
alter table security_incidents enable row level security;
create policy "workspace members can view security incidents" on security_incidents for select using (is_workspace_member(workspace_id));
create policy "workspace members can create security incidents" on security_incidents for insert with check (is_workspace_member(workspace_id));
