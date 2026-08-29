import "server-only";
import { Redis } from "@upstash/redis";

let cachedClient: Redis | null | undefined;

/**
 * Returns null (not a throw) when Upstash isn't configured — every
 * caller in this file's siblings (rate-limit.ts, response-cache.ts)
 * is written to fall back to an in-memory equivalent when this is
 * null, rather than requiring Redis to be present just to run the app
 * locally or in this sandbox.
 */
export function getRedisClient() {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  cachedClient = url && token ? new Redis({ url, token }) : null;
  return cachedClient;
}
