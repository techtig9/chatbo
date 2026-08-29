import { describe, it, expect } from "vitest";
import {
  canAffordAction,
  computeBalanceAfterDeduction,
  canCreateBot,
  canAddKnowledgeDoc,
  canAddSeat,
} from "@/lib/billing/credits";
import { CREDIT_COSTS, PLAN_LIMITS } from "@/lib/billing/plans";

describe("canAffordAction", () => {
  it("allows an action when the balance covers its cost", () => {
    expect(canAffordAction(100, "messageExchange", false)).toBe(true); // costs 10
  });

  it("blocks an action when the balance is below its cost", () => {
    expect(canAffordAction(5, "messageExchange", false)).toBe(false); // costs 10
  });

  it("allows exactly-enough credits (boundary)", () => {
    expect(canAffordAction(CREDIT_COSTS.messageExchange, "messageExchange", false)).toBe(
      true
    );
  });

  it("blocks one credit short of the cost (boundary)", () => {
    expect(
      canAffordAction(CREDIT_COSTS.messageExchange - 1, "messageExchange", false)
    ).toBe(false);
  });

  it("always allows a platform admin, even with 0 credits", () => {
    expect(canAffordAction(0, "knowledgeDocIngested", true)).toBe(true);
  });
});

describe("computeBalanceAfterDeduction", () => {
  it("subtracts the action's credit cost", () => {
    expect(computeBalanceAfterDeduction(100, "messageExchange", false)).toBe(90);
  });

  it("never goes below zero even if called without a prior affordability check", () => {
    expect(computeBalanceAfterDeduction(3, "messageExchange", false)).toBe(0);
  });

  it("leaves a platform admin's balance untouched — zero deduction", () => {
    expect(computeBalanceAfterDeduction(500, "knowledgeDocIngested", true)).toBe(500);
  });
});

describe("plan limits", () => {
  it("free plan allows exactly 1 bot and blocks a 2nd", () => {
    expect(canCreateBot(0, "free")).toBe(true);
    expect(canCreateBot(1, "free")).toBe(false);
  });

  it("business plan has unlimited bots", () => {
    expect(canCreateBot(999, "business")).toBe(true);
  });

  it("starter plan allows 5 bots, blocks a 6th", () => {
    expect(canCreateBot(4, "starter")).toBe(true);
    expect(canCreateBot(5, "starter")).toBe(false);
  });

  it("knowledge doc limits match the pricing table per plan", () => {
    expect(canAddKnowledgeDoc(0, "free")).toBe(true);
    expect(canAddKnowledgeDoc(1, "free")).toBe(false); // free = 1 doc max
    expect(canAddKnowledgeDoc(29, "starter")).toBe(true);
    expect(canAddKnowledgeDoc(30, "starter")).toBe(false);
  });

  it("seat limits match the pricing table per plan", () => {
    expect(canAddSeat(0, "free")).toBe(true);
    expect(canAddSeat(1, "free")).toBe(false);
    expect(canAddSeat(4, "pro")).toBe(true);
    expect(canAddSeat(5, "pro")).toBe(false);
    expect(canAddSeat(50, "business")).toBe(true);
  });
});

describe("PLAN_LIMITS gating consistency", () => {
  it("every higher plan has monthly credits >= every lower plan", () => {
    const order = ["free", "starter", "pro", "business"] as const;
    for (let i = 1; i < order.length; i++) {
      const higher = order[i]!;
      const lower = order[i - 1]!;
      expect(PLAN_LIMITS[higher].monthlyCredits).toBeGreaterThanOrEqual(
        PLAN_LIMITS[lower].monthlyCredits
      );
    }
  });

  it("only Business plan includes audit logs and outbound webhooks", () => {
    for (const plan of ["free", "starter", "pro"] as const) {
      expect(PLAN_LIMITS[plan].features.auditLogs).toBe(false);
      expect(PLAN_LIMITS[plan].features.outboundWebhooks).toBe(false);
    }
    expect(PLAN_LIMITS.business.features.auditLogs).toBe(true);
    expect(PLAN_LIMITS.business.features.outboundWebhooks).toBe(true);
  });
});
