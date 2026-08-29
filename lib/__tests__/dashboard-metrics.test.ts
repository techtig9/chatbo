import { describe, expect, it } from "vitest";
import { pctChange, categorize } from "@/lib/analytics/dashboard";

describe("pctChange", () => {
  it("computes a positive percentage increase", () => {
    expect(pctChange(120, 100)).toBe(20);
  });

  it("computes a negative percentage decrease", () => {
    expect(pctChange(80, 100)).toBe(-20);
  });

  it("rounds to one decimal place", () => {
    expect(pctChange(103, 90)).toBeCloseTo(14.4, 1);
  });

  it("returns 0 when both current and previous are zero", () => {
    expect(pctChange(0, 0)).toBe(0);
  });

  it("returns null (undefined baseline) when previous is 0 but current is positive", () => {
    // Going from 0 -> N is not a meaningful percentage — there's no
    // prior-period baseline to compare against, so this must not render
    // as a wild/misleading number like "+∞%" or "+100%".
    expect(pctChange(5, 0)).toBeNull();
  });
});

describe("categorize", () => {
  it("maps knowledge_source actions to the knowledge category", () => {
    expect(categorize("knowledge_source.added")).toBe("knowledge");
    expect(categorize("knowledge_source.reindexed")).toBe("knowledge");
  });

  it("maps bot actions to the agent category", () => {
    expect(categorize("bot.published")).toBe("agent");
    expect(categorize("bot.deployed.production")).toBe("agent");
  });

  it("maps workflow.activated to the workflow category", () => {
    expect(categorize("workflow.activated")).toBe("workflow");
  });

  it("maps integration.connected to the integration category", () => {
    expect(categorize("integration.connected")).toBe("integration");
  });

  it("maps evaluation.completed to the evaluation category", () => {
    expect(categorize("evaluation.completed")).toBe("evaluation");
  });

  it("maps sensitive membership/credential actions to the security category", () => {
    expect(categorize("workspace.mfa_requirement_changed")).toBe("security");
    expect(categorize("api_key.created")).toBe("security");
    expect(categorize("member.removed")).toBe("security");
  });

  it("falls back to other for anything not explicitly categorized", () => {
    expect(categorize("share_link.created")).toBe("other");
  });
});
