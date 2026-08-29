import "server-only";
import { getRedisClient } from "@/lib/cache/redis-client";

/**
 * Pure sliding-window check — the in-memory backend's algorithm, and
 * the reference behavior the Redis backend approximates. Kept exported
 * and separately tested so the decision logic is verified independent
 * of which backend is active.
 */
export function isWithinRateLimit(
  recentTimestamps: number[],
  now: number,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; remaining: number } {
  const windowStart = now - windowMs;
  const withinWindow = recentTimestamps.filter((t) => t > windowStart);
  const allowed = withinWindow.length < maxRequests;
  return {
    allowed,
    remaining: Math.max(0, maxRequests - withinWindow.length - (allowed ? 1 : 0)),
  };
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const PUBLIC_CHAT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 20,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * In-memory sliding-window store — used automatically whenever Redis
 * isn't configured (local dev, this sandbox, or a deploy that hasn't
 * set up Upstash yet), or if Redis is briefly unreachable.
 */
class InMemoryRateLimiter {
  private store = new Map<string, number[]>();

  check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const existing = this.store.get(key) ?? [];
    const result = isWithinRateLimit(existing, now, config.windowMs, config.maxRequests);

    if (result.allowed) {
      const windowStart = now - config.windowMs;
      const updated = existing.filter((t) => t > windowStart);
      updated.push(now);
      this.store.set(key, updated);
    }

    return result;
  }

  sweep(maxAgeMs: number = 5 * 60_000) {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, timestamps] of this.store.entries()) {
      const fresh = timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) this.store.delete(key);
      else this.store.set(key, fresh);
    }
  }
}

const fallback = new InMemoryRateLimiter();

/**
 * Redis-backed fixed-window counter (INCR + EXPIRE) rather than a true
 * sliding window — a sliding window in Redis needs a sorted-set-per-key
 * with per-request cleanup, meaningfully more round trips for a hot
 * path like this. Fixed window has a known boundary edge case (up to
 * 2x the configured rate right at a window boundary), an acceptable
 * tradeoff for "blunt scripted abuse," not something this app's
 * economics depend on being exact.
 */
async function checkRedis(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) {
    return fallback.check(key, config);
  }

  try {
    const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / config.windowMs)}`;
    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
    }

    return {
      allowed: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
    };
  } catch (err) {
    console.error("Redis rate limit check failed, falling back to in-memory:", err);
    return fallback.check(key, config);
  }
}

export const publicChatRateLimiter = {
  async checkAndRecord(
    key: string,
    config: RateLimitConfig = PUBLIC_CHAT_RATE_LIMIT
  ): Promise<RateLimitResult> {
    return checkRedis(key, config);
  },
};
