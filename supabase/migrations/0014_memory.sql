-- Phase 6: persistent agent memory and conversation summaries
create table if not exists agent_memories (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references bots(id) on delete cascade not null,
  visitor_id text not null,
  category text not null check (category in ('identity','preference','business','context','goal','other')),
  memory_key text not null,
  memory_value text not null,
  confidence numeric not null default 0.8 check (confidence >= 0 and confidence <= 1),
  source_conversation_id uuid references conversations(id) on delete set null,
  last_confirmed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (bot_id, visitor_id, memory_key)
);

create table if not exists conversation_summaries (
  conversation_id uuid primary key references conversations(id) on delete cascade,
  bot_id uuid references bots(id) on delete cascade not null,
  summary text not null,
  covered_message_count int not null default 0,
  updated_at timestamptz default now()
);

create index if not exists idx_agent_memories_visitor on agent_memories(bot_id, visitor_id, updated_at desc);
create index if not exists idx_conversation_summaries_bot on conversation_summaries(bot_id, updated_at desc);

alter table agent_memories enable row level security;
alter table conversation_summaries enable row level security;

-- Service-role/admin paths are used by the chat runtime. Workspace users can read
-- their own agent memories through future dashboard actions; no public policy is added.
