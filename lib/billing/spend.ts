import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CREDIT_COSTS, PLAN_LIMITS, type CreditAction } from "./plans";
import { checkCreditThresholds } from "@/lib/notifications/credit-threshold";
import { createNotification } from "@/lib/notifications/create";
import { getWorkspaceOwner } from "@/lib/notifications/workspace-owner";
import { sendEmail } from "@/lib/email/resend";
import { lowCreditWarningEmail } from "@/lib/email/templates";
import type { Plan } from "@/lib/supabase/types";

export type SpendResult = { success: boolean; newBalance: number };

/**
 * Atomically deducts credits via the `deduct_credits` Postgres function
 * (0002/0008_notifications.sql) — never do a read-then-write of
 * `credits_remaining` in application code, that has a race condition
 * under concurrent requests.
 *
 * Platform admins (users.role === 'admin') should never reach this
 * function at all — the route handler checks `canAffordAction(...,
 * isPlatformAdmin)` first and skips the deduction call entirely, so
 * zero-deduction-for-admins doesn't depend on this function knowing
 * about admin status.
 */
export async function spendCreditsAtomic(
  workspaceId: string,
  action: CreditAction
): Promise<SpendResult> {
  const supabase = createAdminClient();
  const amount = CREDIT_COSTS[action];

  const { data, error } = await supabase
    .rpc("deduct_credits", { p_workspace_id: workspaceId, p_amount: amount })
    .single<{ success: boolean; new_balance: number; old_balance: number }>();

  if (error) {
    throw new Error(`Credit deduction failed: ${error.message}`);
  }

  if (data.success) {
    // Fire-and-check on every successful deduction — cheap when nothing
    // crossed a threshold (the common case), and checkCreditThresholds
    // itself guarantees at most one notification per threshold per
    // billing period via the notified_80_at/100_at flags.
    await maybeNotifyLowCredits(workspaceId, data.old_balance, data.new_balance);
  }

  return { success: data.success, newBalance: data.new_balance };
}

async function maybeNotifyLowCredits(
  workspaceId: string,
  balanceBefore: number,
  balanceAfter: number
): Promise<void> {
  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, notified_80_at, notified_100_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle<{ plan: Plan; notified_80_at: string | null; notified_100_at: string | null }>();

  if (!subscription) return;

  const { shouldNotify80, shouldNotify100 } = checkCreditThresholds(balanceBefore, balanceAfter, {
    monthlyCredits: PLAN_LIMITS[subscription.plan].monthlyCredits,
    notified80: !!subscription.notified_80_at,
    notified100: !!subscription.notified_100_at,
  });

  if (!shouldNotify80 && !shouldNotify100) return;

  const owner = await getWorkspaceOwner(workspaceId);
  if (!owner) return;

  const percentUsed = shouldNotify100 ? 100 : 80;

  await createNotification({
    userId: owner.userId,
    type: `credit_warning_${percentUsed}`,
    title:
      percentUsed === 100
        ? "You've used all your credits this period"
        : "You've used 80% of your credits this period",
    body: `${balanceAfter.toLocaleString()} credits remaining.`,
  });

  const email = lowCreditWarningEmail({
    workspaceName: owner.workspaceName,
    percentUsed,
    creditsRemaining: balanceAfter,
  });
  await sendEmail({ to: owner.email, subject: email.subject, html: email.html });

  await supabase
    .from("subscriptions")
    .update(
      percentUsed === 100
        ? { notified_100_at: new Date().toISOString() }
        : { notified_80_at: new Date().toISOString() }
    )
    .eq("workspace_id", workspaceId);
}
