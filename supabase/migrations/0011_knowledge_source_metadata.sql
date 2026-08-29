-- chatbo.ai — Phase 3 knowledge source metadata
alter table knowledge_sources
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists chunk_count integer not null default 0,
  add column if not exists last_indexed_at timestamptz,
  add column if not exists error_message text;

create index if not exists idx_knowledge_sources_status on knowledge_sources(bot_id, status);
