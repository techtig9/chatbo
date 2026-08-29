import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildBackupDocument, buildBackupObjectKey } from "./document";
import { uploadBackup } from "./storage";

export interface BackupRunResult {
  objectKey: string;
  rowCounts: { bots: number; subscriptions: number; workspace_members: number };
}

export async function runWeeklyBackup(): Promise<BackupRunResult> {
  const supabase = createAdminClient();

  const [botsResult, subscriptionsResult, membersResult] = await Promise.all([
    supabase.from("bots").select("*"),
    supabase.from("subscriptions").select("*"),
    supabase.from("workspace_members").select("*"),
  ]);

  if (botsResult.error) throw new Error(`Backup failed reading bots: ${botsResult.error.message}`);
  if (subscriptionsResult.error) {
    throw new Error(`Backup failed reading subscriptions: ${subscriptionsResult.error.message}`);
  }
  if (membersResult.error) {
    throw new Error(`Backup failed reading workspace_members: ${membersResult.error.message}`);
  }

  const document = buildBackupDocument({
    bots: botsResult.data ?? [],
    subscriptions: subscriptionsResult.data ?? [],
    workspace_members: membersResult.data ?? [],
  });

  const objectKey = buildBackupObjectKey();
  await uploadBackup(objectKey, JSON.stringify(document, null, 2));

  return {
    objectKey,
    rowCounts: {
      bots: document.tables.bots.length,
      subscriptions: document.tables.subscriptions.length,
      workspace_members: document.tables.workspace_members.length,
    },
  };
}
