import { createHash } from "crypto";

/**
 * Deterministic hash of chunk content, used to skip re-embedding text
 * that hasn't changed (the "embedding reuse via content-hash cache" line
 * in the Cost Optimization Strategy). Normalizes whitespace first so a
 * re-ingested document with only formatting differences still hits the
 * cache.
 */
export function hashChunkContent(content: string): string {
  const normalized = content.trim().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
