import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Regression guards for the Phase 9 Create Agent wizard's server actions.
// The wizard is a single client-rendered page that stays mounted across
// all 6 steps (spec section 70) rather than navigating between full
// pages, so its actions must return a result object instead of calling
// redirect() — a redirect thrown from inside a client component's
// startTransition would yank the user out of the wizard mid-flow. Same
// lightweight source-inspection pattern as the other lifecycle-action
// regression tests in this suite.
describe("Create Agent wizard actions stay wizard-safe", () => {
  function read(relativePath: string): string {
    return readFileSync(path.resolve(__dirname, "../..", relativePath), "utf-8");
  }

  it("createBot never calls redirect() — it must return {success, botId} instead", () => {
    const src = read("lib/actions/bots.ts");
    const fnStart = src.indexOf("export async function createBot(");
    const returnIndex = src.indexOf("return { success: true, botId: bot.id", fnStart);
    const fnEnd = src.indexOf("\n}", returnIndex) + 2;
    const fnBody = src.slice(fnStart, fnEnd);
    expect(fnBody).not.toMatch(/redirect\(/);
    expect(fnBody).toMatch(/return \{ success: true, botId: bot\.id/);
  });

  it("addTextSourceForWizard checks RBAC and the plan doc limit before inserting, and never redirects", () => {
    const src = read("lib/actions/knowledge.ts");
    const fnStart = src.indexOf("export async function addTextSourceForWizard");
    const returnIndex = src.indexOf("return { success: true, sourceId: source.id };", fnStart);
    const fnEnd = src.indexOf("\n}", returnIndex) + 2;
    const fnBody = src.slice(fnStart, fnEnd);
    expect(fnBody).not.toMatch(/redirect\(/);
    const rbacIndex = fnBody.indexOf('requireWorkspaceAction(workspace.role, "knowledge:manage")');
    const limitIndex = fnBody.indexOf("canAddKnowledgeDoc(");
    const insertIndex = fnBody.indexOf('.from("knowledge_sources")\n    .insert(');
    const auditIndex = fnBody.indexOf('action: "knowledge_source.added"');
    expect(rbacIndex).toBeGreaterThan(-1);
    expect(limitIndex).toBeGreaterThan(rbacIndex);
    expect(insertIndex).toBeGreaterThan(limitIndex);
    expect(auditIndex).toBeGreaterThan(insertIndex);
  });
});
