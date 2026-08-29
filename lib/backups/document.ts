/**
 * The spec's Phase 1.19 scope is specifically bots, subscriptions, and
 * workspace_members — not a full database dump. This is the minimum
 * set to actually reconstruct "who owns what, on what plan, with which
 * bots" if the primary Supabase project were lost entirely; knowledge
 * chunks, conversations, and messages are real data loss in that
 * scenario too, but are considered recoverable-enough (re-ingest
 * knowledge sources, conversation history has a lower RPO expectation
 * than account/billing state) to stay out of the weekly export's scope
 * — a deliberate choice to document, not an oversight.
 */

export interface BackupDocument {
  exportedAt: string;
  schemaVersion: string;
  tables: {
    bots: Record<string, unknown>[];
    subscriptions: Record<string, unknown>[];
    workspace_members: Record<string, unknown>[];
  };
}

export function buildBackupDocument(tables: {
  bots: Record<string, unknown>[];
  subscriptions: Record<string, unknown>[];
  workspace_members: Record<string, unknown>[];
}): BackupDocument {
  return {
    exportedAt: new Date().toISOString(),
    // Bumped only if the exported table shapes change in a way a
    // restore script would need to know about — not tied to the app's
    // own version number.
    schemaVersion: "1.0",
    tables,
  };
}

/** Deterministic object key so a given week's backup is easy to find
 * and so repeated runs on the same day overwrite rather than pile up
 * (the bucket's own versioning, if enabled, is what preserves history —
 * this key scheme intentionally doesn't try to reimplement that). */
export function buildBackupObjectKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `chatbo-backups/${y}-${m}-${d}.json`;
}
