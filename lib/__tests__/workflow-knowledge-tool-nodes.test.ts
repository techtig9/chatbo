import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Regression guard for Phase 14's "knowledge" and "tool" workflow node
// types (spec section 76 names them as example nodes, but neither existed
// server-side before this phase — only in the type union, never executed).
// Both reuse already-built infrastructure (retrieveForQuery, executeTool)
// rather than duplicating retrieval/tool-execution logic inside the
// workflow engine.
describe("workflow engine executes knowledge and tool nodes using existing infrastructure", () => {
  const src = readFileSync(path.resolve(__dirname, "../workflows/engine.ts"), "utf-8");

  it("'knowledge' case calls retrieveForQuery and requires a botId + query", () => {
    const caseStart = src.indexOf('case "knowledge":');
    const caseEnd = src.indexOf('case "tool":');
    const body = src.slice(caseStart, caseEnd);
    expect(body).toMatch(/retrieveForQuery\(botId, query\)/);
    expect(body).toMatch(/if \(!botId\) throw new Error/);
    expect(body).toMatch(/if \(!query\.trim\(\)\) throw new Error/);
  });

  it("'tool' case calls executeTool and requires a botId + toolKey", () => {
    const caseStart = src.indexOf('case "tool":');
    const caseEnd = src.indexOf('case "http":');
    const body = src.slice(caseStart, caseEnd);
    expect(body).toMatch(/executeTool\(\{ botId, toolKey, input: toolInput \}\)/);
    expect(body).toMatch(/if \(!botId \|\| !toolKey\) throw new Error/);
  });

  it("both node types are part of the WorkflowNodeType union", () => {
    const types = readFileSync(path.resolve(__dirname, "../workflows/types.ts"), "utf-8");
    expect(types).toMatch(/"knowledge"/);
    expect(types).toMatch(/"tool"/);
  });
});
