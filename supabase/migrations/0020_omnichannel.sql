-- Phase 12: Omnichannel communication
create table if not exists public.channel_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  channel text not null check (channel in ('web','hosted','api','whatsapp','slack','discord','teams','email')),
  name text not null,
  status text not null default 'disconnected' check (status in ('disconnected','pending','connected','error','paused')),
  config jsonb not null default '{}'::jsonb,
  secret_encrypted text,
  external_id text,
  last_error text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bot_id, channel, name)
);
create index if not exists channel_connections_workspace_idx on public.channel_connections(workspace_id);
create index if not exists channel_connections_bot_idx on public.channel_connections(bot_id);
create index if not exists channel_connections_channel_idx on public.channel_connections(channel);

create table if not exists public.channel_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  connection_id uuid references public.channel_connections(id) on delete set null,
  channel text not null,
  direction text not null check (direction in ('inbound','outbound')),
  external_event_id text,
  external_user_id text,
  conversation_id uuid references public.conversations(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received','processed','sent','failed','ignored')),
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists channel_events_workspace_idx on public.channel_events(workspace_id, created_at desc);
create index if not exists channel_events_bot_idx on public.channel_events(bot_id, created_at desc);
create unique index if not exists channel_events_external_unique on public.channel_events(channel, external_event_id) where external_event_id is not null;

alter table public.channel_connections enable row level security;
alter table public.channel_events enable row level security;

create policy "workspace members can read channel connections" on public.channel_connections for select using (public.is_workspace_member(workspace_id));
create policy "workspace members can manage channel connections" on public.channel_connections for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "workspace members can read channel events" on public.channel_events for select using (public.is_workspace_member(workspace_id));
create policy "workspace members can manage channel events" on public.channel_events for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
