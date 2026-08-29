-- Phase 9 — production observability, traces, alerts and business outcomes

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  bot_id uuid references bots(id) on delete cascade not null,
  conversation_id uuid references conversations(id) on delete set null,
  request_id text not null,
  channel text,
  status text not null default 'running' check (status in ('running','succeeded','failed','cancelled')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  duration_ms int,
  total_steps int not null default 0,
  tool_calls int not null default 0,
  model_calls int not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cached_tokens bigint not null default 0,
  estimated_cost_usd numeric(12,6) not null default 0,
  provider text,
  model text,
  quality_score numeric(5,2),
  feedback text check (feedback in ('up','down')),
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists agent_trace_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references agent_runs(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  bot_id uuid references bots(id) on delete cascade not null,
  step_index int not null default 0,
  event_type text not null check (event_type in ('run_started','retrieval','memory','model_call','tool_call','tool_result','guardrail','response','error','run_completed')),
  name text,
  status text,
  provider text,
  model text,
  duration_ms int,
  input_tokens bigint,
  output_tokens bigint,
  cost_usd numeric(12,6),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists observability_alert_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  metric text not null check (metric in ('error_rate','latency_ms','cost_usd','tool_failure_rate','quality_score','fallback_rate','runaway_steps')),
  operator text not null check (operator in ('gt','gte','lt','lte')),
  threshold numeric not null,
  window_minutes int not null default 60 check (window_minutes between 5 and 10080),
  enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists observability_alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  rule_id uuid references observability_alert_rules(id) on delete cascade not null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  observed_value numeric,
  threshold numeric,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

create table if not exists agent_business_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  bot_id uuid references bots(id) on delete cascade not null,
  conversation_id uuid references conversations(id) on delete set null,
  event_type text not null check (event_type in ('lead','handoff','appointment','conversion','ticket','custom')),
  value numeric(12,2),
  currency text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_agent_runs_workspace_started on agent_runs(workspace_id, started_at desc);
create index if not exists idx_agent_runs_bot_started on agent_runs(bot_id, started_at desc);
create index if not exists idx_agent_runs_conversation on agent_runs(conversation_id);
create unique index if not exists idx_agent_runs_request on agent_runs(request_id);
create index if not exists idx_trace_events_run on agent_trace_events(run_id, step_index);
create index if not exists idx_trace_events_workspace on agent_trace_events(workspace_id, created_at desc);
create index if not exists idx_alert_rules_workspace on observability_alert_rules(workspace_id, enabled);
create index if not exists idx_alerts_workspace on observability_alerts(workspace_id, created_at desc);
create index if not exists idx_business_events_workspace on agent_business_events(workspace_id, created_at desc);

alter table agent_runs enable row level security;
alter table agent_trace_events enable row level security;
alter table observability_alert_rules enable row level security;
alter table observability_alerts enable row level security;
alter table agent_business_events enable row level security;

create policy "workspace members can view agent runs" on agent_runs for select using (is_workspace_member(workspace_id));
create policy "workspace members can view trace events" on agent_trace_events for select using (is_workspace_member(workspace_id));
create policy "workspace members can manage alert rules" on observability_alert_rules for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
create policy "workspace members can view alerts" on observability_alerts for select using (is_workspace_member(workspace_id));
create policy "workspace members can view business events" on agent_business_events for select using (is_workspace_member(workspace_id));
