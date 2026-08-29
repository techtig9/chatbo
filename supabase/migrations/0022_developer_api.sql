-- chatbo.ai Phase 14 — public developer API hardening
create table if not exists public.api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  idempotency_key text not null,
  request_hash text not null,
  response_status integer not null,
  response_body jsonb not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, api_key_id, idempotency_key)
);

create index if not exists idx_api_idempotency_created on public.api_idempotency_keys(created_at);
create index if not exists idx_api_idempotency_workspace on public.api_idempotency_keys(workspace_id);

alter table public.api_idempotency_keys enable row level security;

create policy "workspace members can view api idempotency records"
on public.api_idempotency_keys for select
using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));
