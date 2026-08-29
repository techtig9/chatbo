import { describe, expect, it } from "vitest";
import { aggregateDelegationStats, pairStatsToNode } from "@/lib/data/agent-network";

function delegation(overrides: Record<string, unknown>) {
  return {
    source_bot_id: "supervisor-1",
    target_bot_id: "specialist-1",
    task: "Default task",
    status: "succeeded",
    result: null,
    created_at: "2026-01-01T00:00:00.000Z",
    completed_at: "2026-01-01T00:00:01.000Z",
    ...overrides,
  };
}

describe("aggregateDelegationStats", () => {
  it("counts succeeded and failed delegations per (source, target) pair", () => {
    const stats = aggregateDelegationStats([
      delegation({ status: "succeeded" }),
      delegation({ status: "succeeded" }),
      delegation({ status: "failed" }),
    ]);
    const entry = stats.get("supervisor-1:specialist-1")!;
    expect(entry.succeeded).toBe(2);
    expect(entry.failed).toBe(1);
  });

  it("keeps separate stats for different (source, target) pairs", () => {
    const stats = aggregateDelegationStats([
      delegation({ target_bot_id: "specialist-1", status: "succeeded" }),
      delegation({ target_bot_id: "specialist-2", status: "failed" }),
    ]);
    expect(stats.get("supervisor-1:specialist-1")?.succeeded).toBe(1);
    expect(stats.get("supervisor-1:specialist-2")?.failed).toBe(1);
  });

  it("averages latency only across succeeded delegations that have a completed_at", () => {
    const stats = aggregateDelegationStats([
      delegation({ created_at: "2026-01-01T00:00:00.000Z", completed_at: "2026-01-01T00:00:02.000Z" }), // 2000ms
      delegation({ created_at: "2026-01-01T00:00:00.000Z", completed_at: "2026-01-01T00:00:04.000Z" }), // 4000ms
      delegation({ status: "failed", completed_at: null }), // excluded
    ]);
    expect(stats.get("supervisor-1:specialist-1")?.latencyTotalMs).toBe(6000);
    expect(stats.get("supervisor-1:specialist-1")?.latencyCount).toBe(2);
  });

  it("sums cost only when the delegation result has a finite estimatedCostUsd", () => {
    const stats = aggregateDelegationStats([
      delegation({ result: { usage: { estimatedCostUsd: 0.01 } } }),
      delegation({ result: { usage: { estimatedCostUsd: 0.03 } } }),
      delegation({ result: {} }), // no usage — excluded
      delegation({ result: null }), // excluded
    ]);
    const entry = stats.get("supervisor-1:specialist-1")!;
    expect(entry.costTotal).toBeCloseTo(0.04, 5);
    expect(entry.costCount).toBe(2);
  });

  it("uses the most recent task — delegations arrive newest-first, and the first one seen wins", () => {
    const stats = aggregateDelegationStats([
      delegation({ task: "Most recent task" }),
      delegation({ task: "Older task" }),
    ]);
    expect(stats.get("supervisor-1:specialist-1")?.lastTask).toBe("Most recent task");
  });
});

describe("pairStatsToNode", () => {
  it("returns all nulls when there is no history for this pair yet", () => {
    expect(pairStatsToNode(undefined)).toEqual({ task: null, latencyMs: null, costUsd: null, successRatePct: null });
  });

  it("computes a success rate from succeeded vs failed, not from an assumed total", () => {
    const stats = aggregateDelegationStats([
      delegation({ status: "succeeded" }),
      delegation({ status: "succeeded" }),
      delegation({ status: "succeeded" }),
      delegation({ status: "failed" }),
    ]);
    const node = pairStatsToNode(stats.get("supervisor-1:specialist-1"));
    expect(node.successRatePct).toBe(75);
  });

  it("averages latency and cost across only the successful runs that had data", () => {
    const stats = aggregateDelegationStats([
      delegation({ created_at: "2026-01-01T00:00:00.000Z", completed_at: "2026-01-01T00:00:01.000Z", result: { usage: { estimatedCostUsd: 0.02 } } }),
      delegation({ created_at: "2026-01-01T00:00:00.000Z", completed_at: "2026-01-01T00:00:03.000Z", result: { usage: { estimatedCostUsd: 0.04 } } }),
    ]);
    const node = pairStatsToNode(stats.get("supervisor-1:specialist-1"));
    expect(node.latencyMs).toBe(2000);
    expect(node.costUsd).toBeCloseTo(0.03, 5);
  });
});
