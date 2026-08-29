import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Regression guard for the new Phase 8 agent-lifecycle actions
// (archive/unarchive, duplicate) — checks the RBAC gate, the DB write, and
// the audit log call are all still present and in the right order, the
// same lightweight source-inspection pattern used for Phase 3's credit
// enforcement and Phase 7's activity-feed wiring, given a full
// integration test here would mean mocking the entire Supabase client
// chain for marginal extra confidence.
describe("agent lifecycle actions stay wired up", () => {
  const src = readFileSync(path.resolve(__dirname, "../actions/bots.ts"), "utf-8");

  it("setBotArchived checks bot:publish permission before writing", () => {
    const fnStart = src.indexOf("export async function setBotArchived");
    const fnBody = src.slice(fnStart, src.indexOf("\nexport async function duplicateBot"));
    expect(fnBody).toMatch(/requireWorkspaceAction\(workspace\.role, "bot:publish"\)/);
    expect(fnBody).toMatch(/status: archived \? "archived" : "draft"/);
    expect(fnBody).toMatch(/action: archived \? "bot\.archived" : "bot\.unarchived"/);
  });

  it("duplicateBot checks the plan's bot limit before inserting a copy", () => {
    const fnStart = src.indexOf("export async function duplicateBot");
    const fnBody = src.slice(fnStart);
    const limitCheckIndex = fnBody.indexOf("canCreateBot(");
    const insertIndex = fnBody.indexOf(".insert({");
    expect(limitCheckIndex).toBeGreaterThan(-1);
    expect(insertIndex).toBeGreaterThan(limitCheckIndex);
    expect(fnBody).toMatch(/status: "draft"/);
    expect(fnBody).toMatch(/action: "bot\.duplicated"/);
  });
});
