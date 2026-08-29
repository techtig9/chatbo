import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Regression guard for Phase 28's error sanitization (spec section 90).
// Confirms the 7 highest-value, most customer-visible catch blocks route
// through toUserMessage instead of echoing err.message directly, so a
// future edit can't silently reintroduce a raw exception leak.
function read(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "../..", relativePath), "utf-8");
}

const FIXED_SITES: [string, string][] = [
  ["lib/knowledge/ingest.ts", 'toUserMessage(err, "index that source")'],
  ["lib/actions/knowledge.ts", 'toUserMessage(err, "fetch and index that URL")'],
  ["lib/actions/knowledge.ts", 'toUserMessage(err, "crawl that website")'],
  ["lib/actions/bots.ts", 'toUserMessage(err, "generate your agent")'],
  ["lib/actions/workflows.ts", 'toUserMessage(error, "run this workflow")'],
  ["lib/actions/orchestration.ts", 'toUserMessage(error, "run this orchestration")'],
  ["lib/actions/evals.ts", 'toUserMessage(error, "run this evaluation suite")'],
];

describe("customer-facing catch blocks route through toUserMessage, not raw err.message", () => {
  for (const [file, expectedCall] of FIXED_SITES) {
    it(`${file} calls ${expectedCall}`, () => {
      expect(read(file)).toContain(expectedCall);
    });
  }

  it("none of the fixed files still show the raw .message directly as user-facing text", () => {
    for (const [file] of FIXED_SITES) {
      const src = read(file);
      // The old anti-pattern: err.message (or .slice(...)) handed straight
      // to a redirect/status update without going through toUserMessage.
      expect(src).not.toMatch(/err instanceof Error \? err\.message(?!\s*[,)])/);
      expect(src).not.toMatch(/error instanceof Error \? error\.message(?!\s*[,)])/);
    }
  });

  it("every fixed catch block also logs the real error server-side before sanitizing it for the user", () => {
    expect(read("lib/knowledge/ingest.ts")).toMatch(/console\.error\(`\[knowledge-ingest\]/);
    expect(read("lib/actions/knowledge.ts")).toMatch(/console\.error\(`\[knowledge\] URL index failed/);
    expect(read("lib/actions/knowledge.ts")).toMatch(/console\.error\(`\[knowledge\] website crawl failed/);
    expect(read("lib/actions/bots.ts")).toMatch(/console\.error\("\[bots\] AI synthesis failed/);
    expect(read("lib/actions/workflows.ts")).toMatch(/console\.error\(`\[workflows\] manual run failed/);
    expect(read("lib/actions/orchestration.ts")).toMatch(/console\.error\(`\[orchestration\] run failed/);
    expect(read("lib/actions/evals.ts")).toMatch(/console\.error\(`\[evals\] suite/);
  });
});
