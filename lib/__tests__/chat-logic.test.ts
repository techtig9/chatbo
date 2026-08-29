import { describe, it, expect } from "vitest";
import { assembleChatRequest } from "@/lib/chat/assemble";
import { isOriginAllowed } from "@/lib/chat/origin-check";
import { isWithinRateLimit } from "@/lib/chat/rate-limit";
import type { RetrievalResult } from "@/lib/knowledge/retrieve";

describe("assembleChatRequest", () => {
  const bot = {
    system_prompt: "You are a helpful assistant for Candle Co.",
    fallback_behavior: "apologize_contact" as const,
    agent_config: {},
  };

  function groundedResult(context: string): RetrievalResult {
    return {
      chunks: [
        { id: "1", content: context, sourceId: "s1", sourceTitle: "FAQ", similarity: 0.9 },
      ],
      contextBlock: `[Source 1: FAQ]\n${context}`,
      useFallback: false,
    };
  }

  const fallbackResult: RetrievalResult = { chunks: [], contextBlock: "", useFallback: true };

  it("includes the retrieved context block when grounded", () => {
    const result = assembleChatRequest(bot, groundedResult("We ship worldwide."), [], "Do you ship internationally?");
    expect(result.system).toContain("We ship worldwide.");
    expect(result.system).toContain("Use the retrieved knowledge as the primary source of truth");
  });

  it("instructs fallback instead of including context when nothing was retrieved", () => {
    const result = assembleChatRequest(bot, fallbackResult, [], "What's the meaning of life?");
    expect(result.system).toContain("You MUST invoke the configured fallback behavior");
    expect(result.system).not.toContain("Use the retrieved knowledge as the primary source of truth");
  });

  it("always includes the bot's own system prompt", () => {
    const result = assembleChatRequest(bot, fallbackResult, [], "hi");
    expect(result.system).toContain("You are a helpful assistant for Candle Co.");
  });

  it("appends the new user message as the final message", () => {
    const result = assembleChatRequest(bot, groundedResult("x"), [], "New question");
    expect(result.messages[result.messages.length - 1]).toEqual({
      role: "user",
      content: "New question",
    });
  });

  it("includes prior history in order before the new message", () => {
    const history: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: "First question" },
      { role: "assistant", content: "First answer" },
    ];
    const result = assembleChatRequest(bot, groundedResult("x"), history, "Second question");
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0]).toEqual(history[0]);
    expect(result.messages[1]).toEqual(history[1]);
  });

  it("caps history to the last 12 turns", () => {
    const longHistory: { role: "user" | "assistant"; content: string }[] = Array.from(
      { length: 20 },
      (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Turn ${i}`,
      })
    );
    const result = assembleChatRequest(bot, groundedResult("x"), longHistory, "Latest");
    // 12 history turns + 1 new message
    expect(result.messages).toHaveLength(13);
    expect(result.messages[0]!.content).toBe("Turn 8"); // last 12 of 20 starts at index 8
  });
});

describe("isOriginAllowed", () => {
  it("allows any origin when no allowlist is configured", () => {
    expect(isOriginAllowed("https://anything.com", null)).toBe(true);
    expect(isOriginAllowed("https://anything.com", [])).toBe(true);
  });

  it("allows an exact domain match", () => {
    expect(isOriginAllowed("https://example.com", ["example.com"])).toBe(true);
  });

  it("allows a subdomain of an allowed domain", () => {
    expect(isOriginAllowed("https://shop.example.com", ["example.com"])).toBe(true);
  });

  it("blocks a domain not on the allowlist", () => {
    expect(isOriginAllowed("https://evil.com", ["example.com"])).toBe(false);
  });

  it("blocks a missing origin when an allowlist is configured", () => {
    expect(isOriginAllowed(null, ["example.com"])).toBe(false);
  });

  it("blocks a malformed origin", () => {
    expect(isOriginAllowed("not-a-url", ["example.com"])).toBe(false);
  });

  it("is case-insensitive on the configured domain", () => {
    expect(isOriginAllowed("https://example.com", ["Example.COM"])).toBe(true);
  });

  it("does not allow a similarly-named but different domain (prefix confusion)", () => {
    // notexample.com must not match a rule for example.com
    expect(isOriginAllowed("https://notexample.com", ["example.com"])).toBe(false);
  });
});

describe("isWithinRateLimit", () => {
  it("allows a request when under the limit", () => {
    const result = isWithinRateLimit([], Date.now(), 60_000, 20);
    expect(result.allowed).toBe(true);
  });

  it("blocks a request once the limit is reached within the window", () => {
    const now = Date.now();
    const timestamps = Array.from({ length: 20 }, () => now - 1000);
    const result = isWithinRateLimit(timestamps, now, 60_000, 20);
    expect(result.allowed).toBe(false);
  });

  it("allows a request again once old timestamps fall outside the window", () => {
    const now = Date.now();
    const timestamps = Array.from({ length: 20 }, () => now - 120_000); // 2 min ago
    const result = isWithinRateLimit(timestamps, now, 60_000, 20);
    expect(result.allowed).toBe(true);
  });

  it("reports decreasing remaining count as requests accumulate", () => {
    const now = Date.now();
    const r1 = isWithinRateLimit([], now, 60_000, 5);
    const r2 = isWithinRateLimit([now - 100], now, 60_000, 5);
    expect(r1.remaining).toBeGreaterThan(r2.remaining);
  });
});
