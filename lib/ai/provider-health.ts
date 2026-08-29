import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GatewayProvider } from "./gateway";

const FAILURE_THRESHOLD = 3;
// Fixed, short backoff rather than exponential — this is a chat gateway,
// not a batch job: a provider that's actually back up should get tried
// again quickly, and the cost of one more failed request is low compared
// to leaving a recovered provider disabled for a long stretch.
const DISABLE_MINUTES = 2;

export interface ProviderHealthRow {
  provider: string;
  consecutiveFailures: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  disabledUntil: string | null;
}

/** Pure — given the current row (or none) and an outcome, what the new
 * row should be. Separated from the DB call so the threshold/backoff
 * logic is unit-testable without mocking Supabase. */
export function nextHealthState(current: ProviderHealthRow | null, success: boolean, now: Date = new Date()): Omit<ProviderHealthRow, "provider"> {
  if (success) {
    return { consecutiveFailures: 0, lastFailureAt: current?.lastFailureAt ?? null, lastSuccessAt: now.toISOString(), disabledUntil: null };
  }
  const consecutiveFailures = (current?.consecutiveFailures ?? 0) + 1;
  const shouldDisable = consecutiveFailures >= FAILURE_THRESHOLD;
  return {
    consecutiveFailures,
    lastFailureAt: now.toISOString(),
    lastSuccessAt: current?.lastSuccessAt ?? null,
    disabledUntil: shouldDisable ? new Date(now.getTime() + DISABLE_MINUTES * 60_000).toISOString() : (current?.disabledUntil ?? null),
  };
}

export function isCurrentlyDisabled(row: ProviderHealthRow | undefined, now: Date = new Date()): boolean {
  return Boolean(row?.disabledUntil && new Date(row.disabledUntil).getTime() > now.getTime());
}

/** Records one gateway attempt's outcome. Never throws — health tracking
 * must not be able to break the actual chat response it's describing. */
export async function recordProviderHealth(provider: GatewayProvider, success: boolean): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: current } = await admin.from("ai_provider_health").select("*").eq("provider", provider).maybeSingle();
    const currentRow: ProviderHealthRow | null = current
      ? { provider: current.provider, consecutiveFailures: current.consecutive_failures, lastFailureAt: current.last_failure_at, lastSuccessAt: current.last_success_at, disabledUntil: current.disabled_until }
      : null;
    const next = nextHealthState(currentRow, success);
    await admin.from("ai_provider_health").upsert({
      provider,
      consecutive_failures: next.consecutiveFailures,
      last_failure_at: next.lastFailureAt,
      last_success_at: next.lastSuccessAt,
      disabled_until: next.disabledUntil,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ai-provider-health] failed to record outcome", provider, err);
  }
}

/** All tracked providers' health in one query — used to skip providers
 * currently in their post-failure cooldown before even attempting them
 * (a real circuit breaker, not just failover-after-trying). */
export async function getDisabledProviders(): Promise<Set<GatewayProvider>> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("ai_provider_health").select("provider, disabled_until");
    const now = new Date();
    const disabled = new Set<GatewayProvider>();
    for (const row of data ?? []) {
      if (row.disabled_until && new Date(row.disabled_until).getTime() > now.getTime()) disabled.add(row.provider as GatewayProvider);
    }
    return disabled;
  } catch (err) {
    console.error("[ai-provider-health] failed to load disabled providers", err);
    return new Set(); // fail open — never block the whole chain on a health-check error
  }
}
