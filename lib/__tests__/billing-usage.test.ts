import { describe, expect, it } from "vitest";
import { buildUsageBars } from "@/lib/data/billing-usage";

const baseArgs = {
  plan: "starter" as const,
  creditsRemaining: 3000,
  botCount: 2,
  seatCount: 1,
  knowledgeDocCount: 10,
  conversationCountThisPeriod: 150,
  apiCallCountThisPeriod: 0,
};

describe("buildUsageBars", () => {
  it("returns all 6 bars spec section 80 asks for, in order", () => {
    const bars = buildUsageBars(baseArgs);
    expect(bars.map((b) => b.label)).toEqual(["Conversations", "AI Credits", "Storage", "Agents", "Seats", "API Calls"]);
  });

  it("computes credits used as monthlyCredits minus remaining, not remaining itself", () => {
    // starter plan = 5000 monthly credits per lib/billing/plans.ts
    const bars = buildUsageBars({ ...baseArgs, creditsRemaining: 3000 });
    const credits = bars.find((b) => b.label === "AI Credits")!;
    expect(credits.used).toBe(2000);
    expect(credits.limit).toBe(5000);
  });

  it("never reports negative credits used, even if remaining somehow exceeds the monthly grant", () => {
    const bars = buildUsageBars({ ...baseArgs, creditsRemaining: 9999 });
    expect(bars.find((b) => b.label === "AI Credits")!.used).toBe(0);
  });

  it("Conversations has no hard limit — it's an informational count, not a percentage bar", () => {
    const bars = buildUsageBars(baseArgs);
    expect(bars.find((b) => b.label === "Conversations")!.limit).toBeNull();
  });

  it("Storage's limit scales with bot count (per-bot doc limit × bots), not a flat number", () => {
    const bars = buildUsageBars({ ...baseArgs, botCount: 3 }); // starter: maxKnowledgeDocsPerBot = 30
    expect(bars.find((b) => b.label === "Storage")!.limit).toBe(90);
  });

  it("Storage limit is null (unlimited) on a plan with no per-bot doc cap", () => {
    const bars = buildUsageBars({ ...baseArgs, plan: "business" });
    expect(bars.find((b) => b.label === "Storage")!.limit).toBeNull();
  });

  it("Agents and Seats limits come straight from the plan, including null for unlimited", () => {
    const starterBars = buildUsageBars(baseArgs);
    expect(starterBars.find((b) => b.label === "Agents")!.limit).toBe(5);
    expect(starterBars.find((b) => b.label === "Seats")!.limit).toBe(2);

    const businessBars = buildUsageBars({ ...baseArgs, plan: "business" });
    expect(businessBars.find((b) => b.label === "Agents")!.limit).toBeNull();
    expect(businessBars.find((b) => b.label === "Seats")!.limit).toBeNull();
  });

  it("API Calls is marked unavailable (-1 sentinel) on a plan with no public API access", () => {
    const bars = buildUsageBars({ ...baseArgs, plan: "free" }); // free: publicApi = "none"
    expect(bars.find((b) => b.label === "API Calls")!.limit).toBe(-1);
  });

  it("API Calls has no hard limit (informational) once the plan does include API access", () => {
    const bars = buildUsageBars({ ...baseArgs, plan: "pro" }); // pro: publicApi = "read"
    expect(bars.find((b) => b.label === "API Calls")!.limit).toBeNull();
  });
});
