import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "./chunking";
import { hashChunkContent } from "./hash";
import { embedTexts } from "@/lib/ai/gemini-embeddings";
import { toUserMessage } from "@/lib/errors/user-facing";

export interface IngestResult {
  chunksCreated: number;
  chunksReusedFromCache: number;
}

/**
 * Ingests one knowledge source's raw text: chunk → check the
 * content-hash cache for each chunk → embed only the ones not already
 * embedded elsewhere → write every chunk (cached or freshly embedded) to
 * knowledge_chunks.
 *
 * Idempotent — deletes any existing chunks for this source first. A
 * no-op delete on first-time ingestion, but it's what makes this same
 * function safe to call again later for RE-ingestion (Phase 1.20's
 * concierge bot needs its help-center source refreshed on a schedule)
 * without needing a separate function or risking duplicate chunks
 * piling up on every refresh.
 *
 * Runs via the admin client since it needs to write regardless of which
 * user's session (or scheduled job) triggered it.
 */
export async function ingestKnowledgeSource(
  sourceId: string,
  botId: string,
  rawText: string
): Promise<IngestResult> {
  const supabase = createAdminClient();

  const setStatus = (status: "processing" | "indexing" | "ready" | "failed", errorMessage: string | null = null) =>
    supabase.from("knowledge_sources").update({ status, error_message: errorMessage, chunk_count: status === "ready" ? undefined : undefined, last_indexed_at: status === "ready" ? new Date().toISOString() : undefined }).eq("id", sourceId);

  try {
    // "processing" (set by the caller at insert time) means "queued, raw
    // content received." This is where real chunking/embedding work
    // actually starts — the distinct "indexing" state spec section 74
    // asks for, not just a cosmetic relabel.
    await setStatus("indexing");
    const chunks = chunkText(rawText);

    if (chunks.length === 0) {
      await setStatus("failed", "No readable content was found.");
      return { chunksCreated: 0, chunksReusedFromCache: 0 };
    }

    const hashes = chunks.map(hashChunkContent);

    // Check the cache for each chunk's hash in parallel — each lookup is
    // a cheap indexed read, and there's no reason to serialize them.
    const cacheResults = await Promise.all(
      hashes.map((hash) => supabase.rpc("find_cached_embedding", { p_content_hash: hash }))
    );

    const toEmbedIndices: number[] = [];
    const embeddings: (number[] | null)[] = cacheResults.map((result, i) => {
      if (result.data) return result.data;
      toEmbedIndices.push(i);
      return null;
    });

    if (toEmbedIndices.length > 0) {
      const textsToEmbed = toEmbedIndices.map((i) => chunks[i]!);
      const freshEmbeddings = await embedTexts(textsToEmbed, "document");
      toEmbedIndices.forEach((chunkIndex, j) => {
        embeddings[chunkIndex] = freshEmbeddings[j]!;
      });
    }

    const rows = chunks.map((content, i) => ({
      source_id: sourceId,
      bot_id: botId,
      content,
      embedding: embeddings[i]!,
      content_hash: hashes[i]!,
      chunk_index: i,
    }));

    // Only delete the old chunks once the new ones are fully chunked and
    // embedded and ready to write — a re-ingestion that fails partway
    // through (bad content, an embedding API error) leaves the OLD
    // chunks in place instead of leaving the bot with nothing. Not
    // wrapped in a single DB transaction (delete-then-insert are two
    // separate calls through the Supabase client), so there's a brief
    // window where a request could race between them — an accepted gap
    // for a knowledge base refresh that runs on a schedule, not a
    // security or correctness issue worth a stored procedure for yet.
    const { error: deleteError } = await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("source_id", sourceId);
    if (deleteError) {
      await setStatus("failed");
      throw new Error(`Failed to clear old knowledge chunks: ${deleteError.message}`);
    }

    const { error: insertError } = await supabase.from("knowledge_chunks").insert(rows);
    if (insertError) {
      await setStatus("failed");
      throw new Error(`Failed to store knowledge chunks: ${insertError.message}`);
    }

    await supabase.from("knowledge_sources").update({ status: "ready", error_message: null, chunk_count: chunks.length, last_indexed_at: new Date().toISOString() }).eq("id", sourceId);

    return {
      chunksCreated: toEmbedIndices.length,
      chunksReusedFromCache: chunks.length - toEmbedIndices.length,
    };
  } catch (err) {
    console.error(`[knowledge-ingest] source ${sourceId} failed`, err);
    await setStatus("failed", toUserMessage(err, "index that source"));
    throw err;
  }
}
