import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// The dashboard's Activity Feed (spec section 68) reads from audit_logs.
// Before this phase, workflow activation, integration connection, and
// evaluation completion never wrote an audit event at all — the feed
// silently couldn't show 3 of its 6 required categories. Guards against
// losing that wiring again, the same way bot-generation-credit-
// enforcement.test.ts guards Phase 3's fix.
describe("activity-feed audit events stay wired to their trigger points", () => {
  const root = path.resolve(__dirname, "../..");
  function read(relativePath: string): string {
    return readFileSync(path.join(root, relativePath), "utf-8");
  }

  it("setWorkflowStatus logs workflow.activated when a workflow goes live", () => {
    const src = read("lib/actions/workflows.ts");
    expect(src).toMatch(/status === "active"/);
    expect(src).toMatch(/action: "workflow\.activated"/);
  });

  it("completeOAuth logs integration.connected once a connection is upserted", () => {
    const src = read("lib/integrations/oauth.ts");
    const upsertIndex = src.indexOf("integration_connections");
    const auditIndex = src.indexOf('action: "integration.connected"');
    expect(upsertIndex).toBeGreaterThan(-1);
    expect(auditIndex).toBeGreaterThan(upsertIndex);
  });

  it("runEvaluationSuite logs evaluation.completed after scoring a run", () => {
    const src = read("lib/evals/service.ts");
    const scoreIndex = src.indexOf("const average =");
    const auditIndex = src.indexOf('action: "evaluation.completed"');
    expect(scoreIndex).toBeGreaterThan(-1);
    expect(auditIndex).toBeGreaterThan(scoreIndex);
  });
});
