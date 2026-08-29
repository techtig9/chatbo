-- chatbo.ai — Phase 26: Advanced Knowledge & RAG
-- Enterprise-grade knowledge bases, metadata, hybrid retrieval, permissions,
-- crawl jobs and retrieval telemetry. Embedding dimension is 768 (Gemini).

create table if not exists knowledge_bases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_knowledge_bases_workspace on knowledge_bases(workspace_id, created_at desc);

-- One default knowledge base per existing bot, preserving the current bot-scoped model.
do $$
declare b record;
begin
  for b in select id, workspace_id, name from bots loop
    insert into knowledge_bases(workspace_id, name, description)
    select b.workspace_id, b.name || ' Knowledge', 'Default knowledge base for ' || b.name
    where not exists (
      select 1 from knowledge_bases kb
      where kb.workspace_id = b.workspace_id and kb.name = b.name || ' Knowledge'
    );
  end loop;
end $$;

alter table knowledge_sources add column if not exists knowledge_base_id uuid references knowledge_bases(id) on delete set null;
alter table knowledge_sources add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table knowledge_sources add column if not exists source_url text;
alter table knowledge_sources add column if not exists content_hash text;
alter table knowledge_sources add column if not exists version integer not null default 1;
alter table knowledge_sources add column if not exists freshness_status text not null default 'unknown' check (freshness_status in ('fresh','stale','unknown'));
alter table knowledge_sources add column if not exists next_sync_at timestamptz;
alter table knowledge_sources add column if not exists last_checked_at timestamptz;

-- Attach existing sources to their bot's default knowledge base.
update knowledge_sources ks
set knowledge_base_id = kb.id
from bots b
join knowledge_bases kb on kb.workspace_id = b.workspace_id and kb.name = b.name || ' Knowledge'
where ks.bot_id = b.id and ks.knowledge_base_id is null;

create index if not exists idx_knowledge_sources_kb on knowledge_sources(knowledge_base_id, status);
create index if not exists idx_knowledge_sources_freshness on knowledge_sources(next_sync_at, freshness_status);

-- Rich metadata and source-level permissions.
create table if not exists knowledge_source_permissions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references knowledge_sources(id) on delete cascade not null,
  bot_id uuid references bots(id) on delete cascade not null,
  access_type text not null check (access_type in ('allow','deny')),
  created_at timestamptz not null default now(),
  unique(source_id, bot_id)
);

create index if not exists idx_knowledge_source_permissions_bot on knowledge_source_permissions(bot_id);

-- Crawl/index jobs are durable records; a worker can process them asynchronously.
create table if not exists knowledge_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  knowledge_base_id uuid references knowledge_bases(id) on delete cascade,
  source_id uuid references knowledge_sources(id) on delete cascade,
  job_type text not null check (job_type in ('index','reindex','crawl','sitemap','refresh')),
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  attempt integer not null default 0,
  max_attempts integer not null default 3,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_ingestion_jobs_status on knowledge_ingestion_jobs(status, created_at);
create index if not exists idx_knowledge_ingestion_jobs_source on knowledge_ingestion_jobs(source_id, created_at desc);

-- Retrieval telemetry used by the Phase 25 analytics layer.
create table if not exists knowledge_retrieval_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  bot_id uuid references bots(id) on delete cascade not null,
  knowledge_base_id uuid references knowledge_bases(id) on delete set null,
  query text not null,
  strategy text not null default 'hybrid',
  candidates integer not null default 0,
  returned_chunks integer not null default 0,
  top_score numeric,
  latency_ms integer,
  fallback boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_retrieval_events_bot on knowledge_retrieval_events(bot_id, created_at desc);

-- Hybrid lexical search. Vector score and full-text score are combined in SQL;
-- caller applies the final relevance gate and top-k cap.
create or replace function hybrid_match_knowledge_chunks(
  p_bot_id uuid,
  p_query_embedding vector(768),
  p_query text,
  p_match_count int default 20
)
returns table (
  id uuid,
  content text,
  source_id uuid,
  source_title text,
  similarity float,
  lexical_score float,
  hybrid_score float
)
language sql stable
as $$
  with vector_hits as (
    select kc.id, kc.content, kc.source_id, ks.title as source_title,
           (1 - (kc.embedding <=> p_query_embedding))::float as similarity
    from knowledge_chunks kc
    join knowledge_sources ks on ks.id = kc.source_id
    where kc.bot_id = p_bot_id
    order by kc.embedding <=> p_query_embedding
    limit greatest(p_match_count, 20)
  ),
  lexical_hits as (
    select kc.id,
           ts_rank_cd(to_tsvector('english', kc.content), websearch_to_tsquery('english', p_query))::float as lexical_score
    from knowledge_chunks kc
    where kc.bot_id = p_bot_id
      and p_query <> ''
      and to_tsvector('english', kc.content) @@ websearch_to_tsquery('english', p_query)
    order by lexical_score desc
    limit greatest(p_match_count, 20)
  )
  select v.id, v.content, v.source_id, v.source_title, v.similarity,
         coalesce(l.lexical_score, 0)::float as lexical_score,
         (v.similarity * 0.75 + least(coalesce(l.lexical_score, 0), 1) * 0.25)::float as hybrid_score
  from vector_hits v
  left join lexical_hits l on l.id = v.id
  order by hybrid_score desc
  limit p_match_count;
$$;

-- Metadata filtering helper for callers that need a constrained source set.
create or replace function knowledge_source_metadata_matches(p_source_id uuid, p_filter jsonb)
returns boolean
language sql stable
as $$
  select coalesce((select metadata @> p_filter from knowledge_sources where id = p_source_id), false);
$$;
