import { describe, expect, it } from "vitest";
import { isQuotaOrRateLimitError, providerChain } from "@/lib/ai/provider-routing";

describe("AI provider routing policy", () => {
  it("uses Groq, then Cerebras, then OpenRouter for normal work", () => {
    expect(providerChain("normal")).toEqual(["groq", "cerebras", "openrouter"]);
  });

  it("uses the same economical chain for simple work", () => {
    expect(providerChain("simple")).toEqual(["groq", "cerebras", "openrouter"]);
  });

  it("adds Claude only for complex work", () => {
    expect(providerChain("complex")).toEqual(["groq", "cerebras", "openrouter", "anthropic"]);
  });

  it("recognizes quota and rate-limit failures", () => {
    expect(isQuotaOrRateLimitError("429 Too Many Requests")).toBe(true);
    expect(isQuotaOrRateLimitError("quota exceeded")).toBe(true);
    expect(isQuotaOrRateLimitError("credits exhausted")).toBe(true);
    expect(isQuotaOrRateLimitError("invalid API key")).toBe(false);
  });
});
