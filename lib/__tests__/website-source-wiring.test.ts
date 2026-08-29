import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Regression guard for Phase 12's addWebsiteSource — lib/knowledge/crawl.ts
// already worked and was already reachable via /api/knowledge/crawl, but
// nothing ever saved a crawl's results as knowledge sources. Checks the
// plan-limit check, the crawl call, and per-page ingest all stay wired in
// the right order, the same source-inspection pattern used for the other
// lifecycle-action regression tests in this suite.
describe("addWebsiteSource stays wired to the crawler and the ingestion pipeline", () => {
  const src = readFileSync(path.resolve(__dirname, "../actions/knowledge.ts"), "utf-8");
  const fnStart = src.indexOf("export async function addWebsiteSource");
  const fnBody = src.slice(fnStart);

  it("checks RBAC before crawling", () => {
    const rbacIndex = fnBody.indexOf("assertCanAddKnowledgeSource(botId)");
    const crawlIndex = fnBody.indexOf("crawlWebsite(startUrl");
    expect(rbacIndex).toBeGreaterThan(-1);
    expect(crawlIndex).toBeGreaterThan(rbacIndex);
  });

  it("checks the plan doc limit per page, so a crawl can partially succeed instead of all-or-nothing", () => {
    expect(fnBody).toMatch(/canAddKnowledgeDoc\(\(currentCount \?\? 0\) \+ added, plan\)/);
  });

  it("ingests each saved page and logs an audit event for it", () => {
    const insertIndex = fnBody.indexOf('type: "website"');
    const ingestIndex = fnBody.indexOf("runIngestAndCharge(botId, source.id, page.text");
    const auditIndex = fnBody.indexOf('action: "knowledge_source.added"');
    expect(insertIndex).toBeGreaterThan(-1);
    expect(ingestIndex).toBeGreaterThan(insertIndex);
    expect(auditIndex).toBeGreaterThan(ingestIndex);
  });
});
