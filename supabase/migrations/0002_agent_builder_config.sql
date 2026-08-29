-- Phase 2: structured AI-agent configuration.
-- Keeps the existing system_prompt for runtime compatibility while giving the
-- builder a durable, extensible configuration surface.
alter table bots
  add column if not exists agent_config jsonb not null default '{}'::jsonb;

create index if not exists bots_agent_config_gin_idx
  on bots using gin (agent_config);
