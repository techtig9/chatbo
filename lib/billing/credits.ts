import type { Plan } from "@/lib/supabase/types";
import { CREDIT_COSTS, PLAN_LIMITS, type CreditAction } from "./plans";

/**
 * Pure decision of whether an action can proceed — no I/O. The route
 * handler is responsible for fetching `creditsRemaining` and
 * `isPlatformAdmin` (from `users.role === 'admin'`, the platform-level
 * role — distinct from a workspace member's `owner/admin/editor/viewer`
 * role) before calling this, and for actually persisting the deduction
 * via `spendCreditsAtomic` below afterward.
 *
 * Per Phase 1.7's Definition of Done: a platform admin has unlimited
 * access with zero deduction — checked first, short-circuits everything
 * else.
 */
export function canAffordAction(
  creditsRemaining: number,
  action: CreditAction,
  isPlatformAdmin: boolean
): boolean {
  if (isPlatformAdmin) return true;
  return creditsRemaining >= CREDIT_COSTS[action];
}

/**
 * Computes the post-deduction balance. Clamped at 0 defensively — in
 * normal operation `canAffordAction` is always checked first so this
 * should never need to clamp, but a function that can silently go
 * negative is a worse failure mode than one that floors at zero.
 */
export function computeBalanceAfterDeduction(
  creditsRemaining: number,
  action: CreditAction,
  isPlatformAdmin: boolean
): number {
  if (isPlatformAdmin) return creditsRemaining;
  return Math.max(0, creditsRemaining - CREDIT_COSTS[action]);
}

export function canCreateBot(currentBotCount: number, plan: Plan): boolean {
  const max = PLAN_LIMITS[plan].maxBots;
  return max === null || currentBotCount < max;
}

export function canAddKnowledgeDoc(
  currentDocCount: number,
  plan: Plan
): boolean {
  const max = PLAN_LIMITS[plan].maxKnowledgeDocsPerBot;
  return max === null || currentDocCount < max;
}

export function canAddSeat(currentSeatCount: number, plan: Plan): boolean {
  const max = PLAN_LIMITS[plan].maxSeats;
  return max === null || currentSeatCount < max;
}

/**
 * A human-readable upgrade nudge — same copy everywhere a limit is hit,
 * rather than each call site inventing its own message.
 */
export function upgradeMessage(reason: "credits" | "bots" | "docs" | "seats"): string {
  switch (reason) {
    case "credits":
      return "You're out of credits for this billing period. Upgrade your plan for more.";
    case "bots":
      return "You've reached this plan's bot limit. Upgrade to create more bots.";
    case "docs":
      return "You've reached this bot's knowledge base size limit for your plan.";
    case "seats":
      return "You've reached this plan's team seat limit. Upgrade to invite more people.";
  }
}
