-- Phase 5: encrypted integration configuration and tool-call metadata.
create index if not exists agent_tools_enabled_idx on public.agent_tools(bot_id, enabled);

alter table public.tool_executions add column if not exists provider text;
alter table public.tool_executions add column if not exists request_id text;
create index if not exists tool_executions_conversation_idx on public.tool_executions(conversation_id, created_at desc);
