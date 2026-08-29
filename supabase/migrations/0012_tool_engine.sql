-- Phase 4: secure agent tool registry and execution audit.
create table if not exists public.agent_tools (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  tool_key text not null,
  enabled boolean not null default false,
  permission text not null default 'read' check (permission in ('read','write','sensitive')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bot_id, tool_key)
);

create table if not exists public.tool_executions (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  tool_key text not null,
  status text not null check (status in ('started','succeeded','failed','blocked')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error_message text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists agent_tools_bot_idx on public.agent_tools(bot_id);
create index if not exists tool_executions_bot_created_idx on public.tool_executions(bot_id, created_at desc);

alter table public.agent_tools enable row level security;
alter table public.tool_executions enable row level security;
