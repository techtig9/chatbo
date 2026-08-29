import { describe, it, expect } from "vitest";
import { checkCreditThresholds, type CreditThresholdState } from "@/lib/notifications/credit-threshold";

function state(overrides: Partial<CreditThresholdState> = {}): CreditThresholdState {
  return { monthlyCredits: 1000, notified80: false, notified100: false, ...overrides };
}

describe("checkCreditThresholds", () => {
  it("does not notify when nowhere near a threshold", () => {
    const result = checkCreditThresholds(500, 490, state());
    expect(result.shouldNotify80).toBe(false);
    expect(result.shouldNotify100).toBe(false);
  });

  it("fires the 80% notification exactly when crossing it", () => {
    // 1000 total, before=210 remaining (79% used), after=190 (81% used)
    const result = checkCreditThresholds(210, 190, state());
    expect(result.shouldNotify80).toBe(true);
    expect(result.shouldNotify100).toBe(false);
  });

  it("does not re-fire 80% if already notified this period", () => {
    const result = checkCreditThresholds(210, 190, state({ notified80: true }));
    expect(result.shouldNotify80).toBe(false);
  });

  it("fires the 100% notification exactly when crossing it", () => {
    // before=10 remaining (99% used), after=0 (100% used)
    const result = checkCreditThresholds(10, 0, state({ notified80: true }));
    expect(result.shouldNotify100).toBe(true);
  });

  it("does not re-fire 100% if already notified", () => {
    const result = checkCreditThresholds(10, 0, state({ notified80: true, notified100: true }));
    expect(result.shouldNotify100).toBe(false);
  });

  it("does not fire 80% again once already past 100%", () => {
    const result = checkCreditThresholds(0, -10, state({ notified80: true, notified100: true }));
    expect(result.shouldNotify80).toBe(false);
    expect(result.shouldNotify100).toBe(false);
  });

  it("fires only 100%, not both, when a single large deduction jumps past 80% straight to 100%", () => {
    const result = checkCreditThresholds(250, 0, state());
    expect(result.shouldNotify100).toBe(true);
    expect(result.shouldNotify80).toBe(false);
  });

  it("handles a workspace with 0 monthly credits without dividing by zero", () => {
    const result = checkCreditThresholds(0, 0, state({ monthlyCredits: 0 }));
    expect(result.shouldNotify80).toBe(false);
    expect(result.shouldNotify100).toBe(false);
  });

  it("does not notify for a balance increase (e.g. a plan upgrade mid-check)", () => {
    const result = checkCreditThresholds(190, 210, state());
    expect(result.shouldNotify80).toBe(false);
    expect(result.shouldNotify100).toBe(false);
  });
});
