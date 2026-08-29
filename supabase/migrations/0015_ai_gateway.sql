-- Phase 7: provider-independent AI gateway, usage ledger and provider health.
create table if not exists ai_usage_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  bot_id uuid references bots(id) on delete cascade not null,
  conversation_id uuid references conversations(id) on delete set null,
  provider text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cached_tokens int not null default 0,
  estimated_cost_usd numeric(12,8) not null default 0,
  latency_ms int not null default 0,
  success boolean not null default true,
  error_message text,
  created_at timestamptz default now()
);
create index if not exists idx_ai_usage_workspace_created on ai_usage_records(workspace_id, created_at desc);
create index if not exists idx_ai_usage_bot_created on ai_usage_records(bot_id, created_at desc);
create index if not exists idx_ai_usage_provider_created on ai_usage_records(provider, created_at desc);
alter table ai_usage_records enable row level security;

create table if not exists ai_provider_health (
  provider text primary key,
  consecutive_failures int not null default 0,
  last_failure_at timestamptz,
  last_success_at timestamptz,
  disabled_until timestamptz,
  updated_at timestamptz default now()
);
alter table ai_provider_health enable row level security;
