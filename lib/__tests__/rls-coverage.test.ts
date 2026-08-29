import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";

// Guards against the exact gap found during the Phase 2 Supabase security
// audit: knowledge_bases, knowledge_ingestion_jobs, knowledge_retrieval_events,
// knowledge_source_permissions and templates were created without RLS ever
// being enabled, which (absent RLS) leaves them governed only by Supabase's
// default authenticated/anon role grants — i.e. readable/writable across
// every workspace, not just the caller's own. Every table this app creates
// must have RLS enabled somewhere in the migration history.
describe("Supabase migrations: every table has RLS enabled", () => {
  const migrationsDir = path.resolve(__dirname, "../../supabase/migrations");
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  const sql = files.map((f) => readFileSync(path.join(migrationsDir, f), "utf-8")).join("\n");

  const created = new Set<string>();
  for (const m of sql.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)/gi)) if (m[1]) created.add(m[1]);

  const rlsEnabled = new Set<string>();
  for (const m of sql.matchAll(/alter table (?:public\.)?(\w+) enable row level security/gi)) if (m[1]) rlsEnabled.add(m[1]);

  it("found a non-trivial number of tables to check (sanity check on the test itself)", () => {
    expect(created.size).toBeGreaterThan(50);
  });

  it("every created table has a matching ENABLE ROW LEVEL SECURITY statement", () => {
    const missing = [...created].filter((t) => !rlsEnabled.has(t)).sort();
    expect(missing).toEqual([]);
  });
});
