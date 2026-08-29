import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { configured, modelFor, type GatewayProvider } from "@/lib/ai/gateway";
import { isCurrentlyDisabled, type ProviderHealthRow } from "@/lib/ai/provider-health";
import { isQuotaOrRateLimitError } from "@/lib/ai/provider-routing";

export type ProviderStatus = "healthy" | "rate_limited" | "unavailable" | "not_configured";

export interface ProviderCardData {
  provider: GatewayProvider;
  priority: number;
  model: string;
  status: ProviderStatus;
  requests: number;
  successRatePct: number | null;
  avgLatencyMs: number | null;
  totalTokens: number;
  costUsd: number;
}

const CHAIN: { provider: GatewayProvider; priority: number }[] = [
  { provider: "groq", priority: 1 },
  { provider: "cerebras", priority: 2 },
  { provider: "openrouter", priority: 3 },
  { provider: "anthropic", priority: 4 },
];

/** Derives a user-facing status from real signals rather than a guess:
 * the circuit breaker's own disabled_until, cross-referenced against
 * whether the provider's most recent failure actually looked like a
 * rate limit (lib/ai/provider-routing.ts's isQuotaOrRateLimitError
 * already exists for exactly this classification). */
function deriveStatus(isConfigured: boolean, health: ProviderHealthRow | undefined, mostRecentErrorMessage: string | null): ProviderStatus {
  if (!isConfigured) return "not_configured";
  if (isCurrentlyDisabled(health)) {
    return mostRecentErrorMessage && isQuotaOrRateLimitError(mostRecentErrorMessage) ? "rate_limited" : "unavailable";
  }
  return "healthy";
}

/**
 * AI Gateway dashboard data (spec section 78) — one card per provider in
 * the actual failover chain (Groq -> Cerebras -> OpenRouter -> Claude),
 * each with real usage metrics and a status derived from
 * ai_provider_health, which Phase 16 is what first started writing to —
 * the table existed since Phase 1 but nothing had ever recorded to it.
 */
export async function getProviderDashboard(workspaceId: string, days = 7): Promise<ProviderCardData[]> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [{ data: usageRows }, { data: healthRows }] = await Promise.all([
    admin.from("ai_usage_records").select("provider, model, input_tokens, output_tokens, estimated_cost_usd, latency_ms, success, error_message, created_at").eq("workspace_id", workspaceId).gte("created_at", since).limit(5000),
    admin.from("ai_provider_health").select("*"),
  ]);

  const healthByProvider = new Map((healthRows ?? []).map((h) => [h.provider, { provider: h.provider, consecutiveFailures: h.consecutive_failures, lastFailureAt: h.last_failure_at, lastSuccessAt: h.last_success_at, disabledUntil: h.disabled_until } as ProviderHealthRow]));

  return CHAIN.map(({ provider, priority }) => {
    const rows = (usageRows ?? []).filter((r) => r.provider === provider).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const succeeded = rows.filter((r) => r.success).length;
    const totalTokens = rows.reduce((s, r) => s + Number(r.input_tokens) + Number(r.output_tokens), 0);
    const costUsd = rows.reduce((s, r) => s + Number(r.estimated_cost_usd), 0);
    const latencies = rows.filter((r) => r.latency_ms > 0).map((r) => r.latency_ms);
    const mostRecentError = rows.find((r) => !r.success)?.error_message ?? null;

    return {
      provider,
      priority,
      model: modelFor(provider),
      status: deriveStatus(configured(provider), healthByProvider.get(provider), mostRecentError),
      requests: rows.length,
      successRatePct: rows.length > 0 ? Math.round((succeeded / rows.length) * 100) : null,
      avgLatencyMs: latencies.length > 0 ? Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length) : null,
      totalTokens,
      costUsd,
    };
  });
}
