import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Regression guard for Phase 13's Fallback Rate KPI (spec section 75).
// "Did this run use the configured fallback behavior" only ever existed
// as a transient SSE field before this phase — never persisted anywhere
// queryable, so there was no way to compute a rate from it. Checks the
// full chain stays wired: stream-completion passes the flag ->
// finishAgentRun persists it -> the analytics engine selects and
// aggregates it. Same source-inspection pattern as the other wiring
// regression tests in this suite.
function read(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "../..", relativePath), "utf-8");
}

describe("Fallback Rate stays wired end to end", () => {
  it("stream-completion.ts passes usedFallback into the successful-run finishAgentRun call", () => {
    const src = read("lib/chat/stream-completion.ts");
    const successCallIndex = src.indexOf('status: "succeeded"');
    const successCallEnd = src.indexOf("\n", successCallIndex);
    const successCallLine = src.slice(successCallIndex, successCallEnd);
    expect(successCallLine).toMatch(/usedFallback: retrieval\.useFallback/);
  });

  it("finishAgentRun persists used_fallback on the agent_runs row", () => {
    const src = read("lib/observability/tracing.ts");
    const fnStart = src.indexOf("export async function finishAgentRun");
    const updateIndex = src.indexOf(".update({", fnStart);
    const updateEnd = src.indexOf("}).eq(", updateIndex);
    const updateBody = src.slice(updateIndex, updateEnd);
    expect(src.slice(fnStart, updateIndex)).toMatch(/usedFallback\?: boolean/);
    expect(updateBody).toMatch(/used_fallback: args\.usedFallback \?\? false/);
  });

  it("the analytics engine selects used_fallback and returns an aggregated fallbackRate", () => {
    const src = read("lib/analytics/engine.ts");
    expect(src).toMatch(/agent_runs"\)\.select\("[^"]*used_fallback/);
    expect(src).toMatch(/fallbackRuns = rs\.filter\(r => r\.used_fallback\)/);
    expect(src).toMatch(/fallbackRate,?\s*\n?\s*\};/);
  });
});
