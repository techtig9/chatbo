import "server-only";

export type RoutingComplexity = "simple" | "normal" | "complex";
export type RoutingProvider = "groq" | "cerebras" | "openrouter" | "anthropic";

/**
 * Chatbo's production provider policy.
 *
 * Simple/normal:
 *   Groq -> Cerebras -> OpenRouter
 *
 * Complex:
 *   Groq -> Cerebras -> OpenRouter -> Anthropic (Claude)
 *
 * The chain advances automatically after quota/rate-limit errors (429),
 * provider outages, timeouts and other failed requests.
 */
export function providerChain(complexity: RoutingComplexity): RoutingProvider[] {
  return complexity === "complex"
    ? ["groq", "cerebras", "openrouter", "anthropic"]
    : ["groq", "cerebras", "openrouter"];
}

export function isQuotaOrRateLimitError(message: string): boolean {
  return /\b429\b|rate[ -]?limit|quota|too many requests|usage limit|capacity|credits exhausted|insufficient credits/i.test(message);
}
