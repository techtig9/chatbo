import type { Plan } from "@/lib/supabase/types";

/**
 * Paddle price IDs are per-account (sandbox vs live have different
 * IDs), so they're env vars, not constants — set these once a real
 * Paddle product/price catalog exists.
 */
function buildPriceIdToPlanMap(): Record<string, Plan> {
  const map: Partial<Record<string, Plan>> = {};
  if (process.env.PADDLE_PRICE_ID_STARTER) map[process.env.PADDLE_PRICE_ID_STARTER] = "starter";
  if (process.env.PADDLE_PRICE_ID_PRO) map[process.env.PADDLE_PRICE_ID_PRO] = "pro";
  if (process.env.PADDLE_PRICE_ID_BUSINESS) map[process.env.PADDLE_PRICE_ID_BUSINESS] = "business";
  return map as Record<string, Plan>;
}

export function planForPriceId(priceId: string): Plan | null {
  const map = buildPriceIdToPlanMap();
  return map[priceId] ?? null;
}

/**
 * Pure variant taking the map as a parameter instead of reading env vars
 * — this is what unit tests exercise directly, so the lookup logic is
 * verified independent of which env vars happen to be set wherever
 * tests run.
 */
export function resolvePlanFromPriceId(
  priceId: string,
  priceIdToPlan: Record<string, Plan>
): Plan | null {
  return priceIdToPlan[priceId] ?? null;
}
