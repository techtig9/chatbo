-- chatbo.ai — knowledge retrieval (Phase 1.4)

-- Top-k cosine similarity search, scoped to one bot. Returns similarity
-- as 1 - cosine_distance so callers work with "higher is better" scores
-- (matches the app-side SIMILARITY_THRESHOLD convention in
-- lib/knowledge/retrieval-logic.ts) rather than pgvector's raw distance.
create or replace function match_knowledge_chunks(
  p_bot_id uuid,
  p_query_embedding vector(1024),
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

-- Embedding-reuse cache lookup: given a content hash, find an existing
-- embedding for identical content already ingested anywhere (not just
-- this bot) — re-embedding unchanged text is pure wasted Voyage spend.
create or replace function find_cached_embedding(p_content_hash text)
returns vector(1024)
language sql
stable
as $$
  select embedding
  from knowledge_chunks
  where content_hash = p_content_hash
  limit 1;
$$;
