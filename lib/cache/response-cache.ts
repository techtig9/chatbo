import "server-only";
import { getRedisClient } from "./redis-client";

// 1 hour — long enough to catch repeated FAQ-style questions within a
// session or across visitors, short enough that a knowledge base edit
// (which changes the cache key anyway, see response-cache-key.ts)
// isn't the only way stale content ever expires.
const CACHE_TTL_SECONDS = 60 * 60;

export interface CachedResponse {
  reply: string;
  usedFallback: boolean;
  citations: { sourceId: string; sourceTitle: string }[] | null;
}

/**
 * Returns null on a miss OR when Redis isn't configured — callers
 * always fall through to a real generation call either way, so this
 * never needs its own separate fallback path the way rate limiting
 * did (a cache being unavailable just means slightly higher cost, not
 * a broken feature).
 */
export async function getCachedResponse(key: string): Promise<CachedResponse | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get<CachedResponse>(key);
    return cached ?? null;
  } catch (err) {
    console.error("Response cache read failed:", err);
    return null;
  }
}

export async function setCachedResponse(key: string, value: CachedResponse): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: CACHE_TTL_SECONDS });
  } catch (err) {
    console.error("Response cache write failed:", err);
  }
}
