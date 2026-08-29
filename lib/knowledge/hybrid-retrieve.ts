import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/ai/gemini-embeddings";
import { filterRelevantChunks, shouldTriggerFallback, type RetrievedChunk } from "./retrieval-logic";

export interface HybridRetrievalOptions {
  matchCount?: number;
  metadataFilter?: Record<string, unknown>;
  threshold?: number;
}

export async function hybridRetrieveForQuery(botId: string, query: string, options: HybridRetrievalOptions = {}) {
  const started = Date.now();
  const supabase = createAdminClient();
  const db = supabase as any;
  const embedding = await embedText(query, "query");
  const { data, error } = await db.rpc("hybrid_match_knowledge_chunks", {
    p_bot_id: botId,
    p_query_embedding: embedding,
    p_query: query,
    p_match_count: options.matchCount ?? 20,
  });
  if (error) throw new Error(`Hybrid retrieval failed: ${error.message}`);

  const rows = (data ?? []) as Array<{ id: string; content: string; source_id: string; source_title: string; similarity: number; lexical_score: number; hybrid_score: number }>;
  let candidates = rows.map((r) => ({ id: r.id, content: r.content, sourceId: r.source_id, sourceTitle: r.source_title, similarity: r.hybrid_score }));

  if (options.metadataFilter && Object.keys(options.metadataFilter).length) {
    const ids = await Promise.all(candidates.map(async c => {
      const result = await db.rpc("knowledge_source_metadata_matches", { p_source_id: c.sourceId, p_filter: options.metadataFilter });
      return result.data ? c.id : null;
    }));
    const allowed = new Set(ids.filter(Boolean));
    candidates = candidates.filter(c => allowed.has(c.id));
  }

  const chunks = filterRelevantChunks(candidates, options.threshold ?? 0.5);
  const useFallback = shouldTriggerFallback(chunks);
  const latencyMs = Date.now() - started;

  // Telemetry must never make a customer query fail.
  try {
    const { data: bot } = await db.from("bots").select("workspace_id").eq("id", botId).single();
    if (bot) {
      const { data: kb } = await db.from("knowledge_bases").select("id").eq("workspace_id", bot.workspace_id).limit(1).maybeSingle();
      await db.from("knowledge_retrieval_events").insert({ workspace_id: bot.workspace_id, bot_id: botId, knowledge_base_id: kb?.id ?? null, query, strategy: "hybrid", candidates: rows.length, returned_chunks: chunks.length, top_score: chunks[0]?.similarity ?? null, latency_ms: latencyMs, fallback: useFallback });
    }
  } catch { /* observability must not break retrieval */ }

  return { chunks, useFallback, latencyMs, candidates: rows.length };
}
