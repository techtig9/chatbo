-- Phase 8: agent evaluation suites, test cases, runs, results and release gates.
create table if not exists eval_suites (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references bots(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists eval_test_cases (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid references eval_suites(id) on delete cascade not null,
  name text not null,
  input text not null,
  expected text,
  required_tools text[] not null default '{}',
  forbidden_tools text[] not null default '{}',
  tags text[] not null default '{}',
  created_at timestamptz default now()
);
create table if not exists eval_runs (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid references eval_suites(id) on delete cascade not null,
  bot_id uuid references bots(id) on delete cascade not null,
  status text not null default 'queued' check (status in ('queued','running','passed','failed')),
  score int,
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz default now(),
  completed_at timestamptz
);
create table if not exists eval_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references eval_runs(id) on delete cascade not null,
  test_case_id uuid references eval_test_cases(id) on delete cascade not null,
  score int not null,
  task_score numeric(5,4) not null default 0,
  groundedness_score numeric(5,4) not null default 0,
  tool_score numeric(5,4) not null default 0,
  safety_score numeric(5,4) not null default 0,
  efficiency_score numeric(5,4) not null default 0,
  provider text,
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  latency_ms int not null default 0,
  tool_calls int not null default 0,
  final_output text,
  trace jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_eval_suites_bot on eval_suites(bot_id);
create index if not exists idx_eval_cases_suite on eval_test_cases(suite_id);
create index if not exists idx_eval_runs_bot on eval_runs(bot_id, started_at desc);
create index if not exists idx_eval_results_run on eval_results(run_id);
alter table eval_suites enable row level security;
alter table eval_test_cases enable row level security;
alter table eval_runs enable row level security;
alter table eval_results enable row level security;

create policy "workspace members can read eval suites" on eval_suites for select using (exists (select 1 from workspace_members wm join bots b on b.workspace_id = wm.workspace_id where b.id = eval_suites.bot_id and wm.user_id = auth.uid()));
create policy "workspace editors can write eval suites" on eval_suites for all using (exists (select 1 from workspace_members wm join bots b on b.workspace_id = wm.workspace_id where b.id = eval_suites.bot_id and wm.user_id = auth.uid() and wm.role in ('owner','admin','editor'))) with check (exists (select 1 from workspace_members wm join bots b on b.workspace_id = wm.workspace_id where b.id = eval_suites.bot_id and wm.user_id = auth.uid() and wm.role in ('owner','admin','editor')));
create policy "workspace members can read eval cases" on eval_test_cases for select using (exists (select 1 from eval_suites s join bots b on b.id = s.bot_id join workspace_members wm on wm.workspace_id = b.workspace_id where s.id = eval_test_cases.suite_id and wm.user_id = auth.uid()));
create policy "workspace editors can write eval cases" on eval_test_cases for all using (exists (select 1 from eval_suites s join bots b on b.id = s.bot_id join workspace_members wm on wm.workspace_id = b.workspace_id where s.id = eval_test_cases.suite_id and wm.user_id = auth.uid() and wm.role in ('owner','admin','editor'))) with check (exists (select 1 from eval_suites s join bots b on b.id = s.bot_id join workspace_members wm on wm.workspace_id = b.workspace_id where s.id = eval_test_cases.suite_id and wm.user_id = auth.uid() and wm.role in ('owner','admin','editor')));
create policy "workspace members can read eval runs" on eval_runs for select using (exists (select 1 from bots b join workspace_members wm on wm.workspace_id = b.workspace_id where b.id = eval_runs.bot_id and wm.user_id = auth.uid()));
create policy "workspace members can read eval results" on eval_results for select using (exists (select 1 from eval_runs r join bots b on b.id = r.bot_id join workspace_members wm on wm.workspace_id = b.workspace_id where r.id = eval_results.run_id and wm.user_id = auth.uid()));
