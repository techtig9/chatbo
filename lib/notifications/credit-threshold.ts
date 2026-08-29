export interface CreditThresholdState {
  monthlyCredits: number;
  notified80: boolean;
  notified100: boolean;
}

export interface CreditThresholdResult {
  shouldNotify80: boolean;
  shouldNotify100: boolean;
}

/**
 * Decides whether a credit deduction just crossed the 80% or 100%
 * usage threshold for the FIRST time this billing period. The
 * "notified80/notified100" flags are reset to false whenever
 * reset_monthly_credits runs (see 0008_notifications.sql), so this
 * function only needs to answer "did we cross it, and have we already
 * told them" — not track dates or periods itself.
 *
 * balanceBefore/After are both credits REMAINING, so usage% = 1 -
 * (remaining / monthlyCredits) — lower balance means higher usage.
 */
export function checkCreditThresholds(
  balanceBefore: number,
  balanceAfter: number,
  state: CreditThresholdState
): CreditThresholdResult {
  if (state.monthlyCredits <= 0) {
    return { shouldNotify80: false, shouldNotify100: false };
  }

  const usageBefore = 1 - balanceBefore / state.monthlyCredits;
  const usageAfter = 1 - balanceAfter / state.monthlyCredits;

  const crossed100 = usageBefore < 1 && usageAfter >= 1;
  const crossed80 = usageBefore < 0.8 && usageAfter >= 0.8;

  return {
    // 100% crossing doesn't also fire the 80% notification if both are
    // crossed in the same deduction (a big ingestion charge could jump
    // straight past 80% to 100%) — one email for the more urgent event,
    // not two at once.
    shouldNotify80: crossed80 && !crossed100 && !state.notified80,
    shouldNotify100: crossed100 && !state.notified100,
  };
}
