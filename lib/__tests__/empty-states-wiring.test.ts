import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Regression guard for Phase 25 (spec section 87). Several of these
// empty states deliberately distinguish "this list has never had
// anything in it" (the real empty state — icon, explanation, primary
// action) from "the current filter/search just has no matches" (a much
// lighter, expected, frequently-hit state that doesn't need the full
// treatment) — losing that distinction would either show a heavy empty
// state on every search-with-no-results, or a bare "no results" message
// the one time it's genuinely a brand-new, unused feature.
function read(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "../..", relativePath), "utf-8");
}

describe("empty vs filtered-empty stays distinguished", () => {
  it("the conversation list checks the raw conversations count before showing the rich empty state, not just the filtered count", () => {
    const src = read("components/conversations/conversation-list.tsx");
    const emptyBranch = src.slice(src.indexOf("filtered.length === 0"), src.indexOf("No conversations match"));
    expect(emptyBranch).toMatch(/conversations\.length === 0/);
    expect(emptyBranch).toMatch(/No conversations yet/);
    expect(emptyBranch).toMatch(/Deploy your agent/);
  });

  it("the knowledge source grid checks the raw sources count before showing the rich empty state, not just the filtered count", () => {
    const src = read("components/knowledge/knowledge-source-grid.tsx");
    const emptyBranch = src.slice(src.indexOf("filtered.length === 0"), src.indexOf("No sources match"));
    expect(emptyBranch).toMatch(/sources\.length === 0/);
    expect(emptyBranch).toMatch(/<EmptyState/);
  });
});

describe("empty-state primary actions are real, not decorative", () => {
  it("the knowledge empty state's action scrolls to the real add-source forms, not a dead button", () => {
    const src = read("components/knowledge/knowledge-source-grid.tsx");
    expect(src).toMatch(/document\.getElementById\("add-source"\)\?\.scrollIntoView/);
    const pageSrc = read("app/dashboard/bots/[id]/knowledge/page.tsx");
    expect(pageSrc).toMatch(/id="add-source"/);
  });

  it("the empty workflows state's action focuses the real create-workflow input, not a dead button", () => {
    const src = read("components/workflows/empty-workflows-state.tsx");
    expect(src).toMatch(/document\.getElementById\("new-workflow-name"\)\?\.focus/);
    const pageSrc = read("app/dashboard/workflows/page.tsx");
    expect(pageSrc).toMatch(/id="new-workflow-name"/);
  });
});
