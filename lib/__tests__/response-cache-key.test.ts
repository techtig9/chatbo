import { describe, it, expect } from "vitest";
import { buildResponseCacheKey } from "@/lib/cache/response-cache-key";

describe("buildResponseCacheKey", () => {
  it("is deterministic for the same inputs", () => {
    const a = buildResponseCacheKey("bot1", "What are your hours?", "context text");
    const b = buildResponseCacheKey("bot1", "What are your hours?", "context text");
    expect(a).toBe(b);
  });

  it("normalizes question case and whitespace", () => {
    const a = buildResponseCacheKey("bot1", "What are your hours?", "ctx");
    const b = buildResponseCacheKey("bot1", "  WHAT ARE   your Hours?  ", "ctx");
    expect(a).toBe(b);
  });

  it("differs for different bots (same question, same context)", () => {
    const a = buildResponseCacheKey("bot1", "hours?", "ctx");
    const b = buildResponseCacheKey("bot2", "hours?", "ctx");
    expect(a).not.toBe(b);
  });

  it("differs for different questions", () => {
    const a = buildResponseCacheKey("bot1", "hours?", "ctx");
    const b = buildResponseCacheKey("bot1", "location?", "ctx");
    expect(a).not.toBe(b);
  });

  it("differs when the retrieved context changes — this is what makes a knowledge base update invalidate stale cached answers", () => {
    const a = buildResponseCacheKey("bot1", "hours?", "We're open 9-5.");
    const b = buildResponseCacheKey("bot1", "hours?", "We're open 24/7 now.");
    expect(a).not.toBe(b);
  });

  it("is namespaced with a stable prefix", () => {
    const key = buildResponseCacheKey("bot1", "hours?", "ctx");
    expect(key).toMatch(/^response-cache:bot1:/);
  });
});
