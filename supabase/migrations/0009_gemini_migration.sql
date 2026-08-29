-- chatbo.ai — switch knowledge embeddings from Voyage (1024-dim) to
-- Gemini (768-dim). Old and new embeddings are NOT compatible — every
-- existing knowledge chunk must be re-ingested from scratch after this
-- runs. Retrieval returns nothing for any bot until you do.

drop index if exists idx_knowledge_chunks_embedding;

drop function if exists find_cached_embedding(text);
drop function if exists match_knowledge_chunks(uuid, vector(1024), int);

delete from knowledge_chunks;

alter table knowledge_chunks
  alter column embedding type vector(768);

create index idx_knowledge_chunks_embedding on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_knowledge_chunks(
  p_bot_id uuid,
  p_query_embedding vector(768),
  p_match_count int default 10
)
returns table (
  id uuid,
  content text,
  source_id uuid,
  source_title text,
  similarity float
)
language sql
stable
as $$
  select
    kc.id,
    kc.content,
    kc.source_id,
    ks.title as source_title,
    1 - (kc.embedding <=> p_query_embedding) as similarity
  from knowledge_chunks kc
  join knowledge_sources ks on ks.id = kc.source_id
  where kc.bot_id = p_bot_id
  order by kc.embedding <=> p_query_embedding
  limit p_match_count;
$$;

create or replace function find_cached_embedding(p_content_hash text)
returns vector(768)
language sql
stable
as $$
  select embedding
  from knowledge_chunks
  where content_hash = p_content_hash
  limit 1;
$$;
