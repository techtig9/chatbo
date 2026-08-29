import { describe, it, expect } from "vitest";
import { buildBackupDocument, buildBackupObjectKey } from "@/lib/backups/document";

describe("buildBackupDocument", () => {
  const tables = {
    bots: [{ id: "b1", name: "Test Bot" }],
    subscriptions: [{ id: "s1", plan: "pro" }],
    workspace_members: [{ id: "m1", role: "owner" }],
  };

  it("includes all three required tables", () => {
    const doc = buildBackupDocument(tables);
    expect(doc.tables.bots).toEqual(tables.bots);
    expect(doc.tables.subscriptions).toEqual(tables.subscriptions);
    expect(doc.tables.workspace_members).toEqual(tables.workspace_members);
  });

  it("stamps a valid ISO timestamp", () => {
    const doc = buildBackupDocument(tables);
    expect(() => new Date(doc.exportedAt).toISOString()).not.toThrow();
    expect(new Date(doc.exportedAt).toISOString()).toBe(doc.exportedAt);
  });

  it("includes a schema version", () => {
    const doc = buildBackupDocument(tables);
    expect(doc.schemaVersion).toBe("1.0");
  });

  it("handles empty tables without error", () => {
    const doc = buildBackupDocument({ bots: [], subscriptions: [], workspace_members: [] });
    expect(doc.tables.bots).toEqual([]);
  });
});

describe("buildBackupObjectKey", () => {
  it("formats as chatbo-backups/YYYY-MM-DD.json", () => {
    const date = new Date(Date.UTC(2026, 2, 5)); // March 5, 2026
    expect(buildBackupObjectKey(date)).toBe("chatbo-backups/2026-03-05.json");
  });

  it("zero-pads single-digit months and days", () => {
    const date = new Date(Date.UTC(2026, 0, 9)); // Jan 9, 2026
    expect(buildBackupObjectKey(date)).toBe("chatbo-backups/2026-01-09.json");
  });

  it("does not zero-pad the year", () => {
    const date = new Date(Date.UTC(2026, 11, 31));
    expect(buildBackupObjectKey(date)).toBe("chatbo-backups/2026-12-31.json");
  });

  it("defaults to the current date when none is passed", () => {
    const key = buildBackupObjectKey();
    expect(key).toMatch(/^chatbo-backups\/\d{4}-\d{2}-\d{2}\.json$/);
  });
});
