export interface RetrievedChunk {
  id: string;
  content: string;
  sourceId: string;
  sourceTitle: string;
  similarity: number; // 0–1, cosine similarity
}

/**
 * Below this cosine similarity, a chunk isn't actually relevant to the
 * question — including it as "grounding" would be worse than not
 * grounding at all, since it dresses up a guess as if it were sourced.
 * 0.5 is a starting point, not a scientifically derived constant —
 * tune it against real conversation logs once they exist.
 */
export const SIMILARITY_THRESHOLD = 0.5;

export const MAX_RETRIEVED_CHUNKS = 5;

/**
 * Filters raw top-k results down to the ones actually worth grounding an
 * answer in. Pure — takes already-fetched candidates, no DB access.
 */
export function filterRelevantChunks(
  candidates: RetrievedChunk[],
  threshold: number = SIMILARITY_THRESHOLD
): RetrievedChunk[] {
  return candidates
    .filter((c) => c.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_RETRIEVED_CHUNKS);
}

/**
 * The groundedness gate: if nothing survived the threshold, the bot's
 * configured fallback fires instead of a generation call grounded in
 * nothing. This is the single most important function in the whole
 * retrieval pipeline — it's what makes "never improvised from general
 * knowledge" (Hard Constraint #4) an enforced behavior instead of just
 * a hope the system prompt's wording is strong enough to guarantee.
 */
export function shouldTriggerFallback(relevantChunks: RetrievedChunk[]): boolean {
  return relevantChunks.length === 0;
}

/**
 * Formats retrieved chunks into the context block injected into the
 * chat call, with source labels the model can cite by.
 */
export function formatChunksForContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";

  return chunks
    .map((chunk, i) => `[Source ${i + 1}: ${chunk.sourceTitle}]\n${chunk.content}`)
    .join("\n\n---\n\n");
}
