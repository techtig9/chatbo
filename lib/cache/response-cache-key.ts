import { createHash } from "crypto";

/**
 * Keys a cached response by bot + normalized question + a hash of the
 * retrieved context, not just the question text alone. That last part
 * matters: caching purely by question would keep serving a stale
 * answer after the knowledge base changes (an edited or newly-added
 * source would produce a different context block, which is exactly
 * what should invalidate the cache — and does, automatically, since
 * it changes the key).
 */
export function buildResponseCacheKey(
  botId: string,
  question: string,
  contextBlock: string
): string {
  const normalizedQuestion = question.trim().toLowerCase().replace(/\s+/g, " ");
  const contextHash = createHash("sha256").update(contextBlock).digest("hex").slice(0, 16);
  const questionHash = createHash("sha256").update(normalizedQuestion).digest("hex").slice(0, 16);
  return `response-cache:${botId}:${contextHash}:${questionHash}`;
}
