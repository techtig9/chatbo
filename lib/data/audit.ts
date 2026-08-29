import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuditAction } from "@/lib/audit/log";

export interface AuditLogRow {
  id: string;
  actorEmail: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
}

const PAGE_SIZE = 25;

export async function listAuditLogs(params: {
  workspaceId: string;
  page: number;
  actionFilter?: string;
}): Promise<{ rows: AuditLogRow[]; totalCount: number; pageSize: number }> {
  const supabase = createClient();
  const from = params.page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("audit_logs")
    .select("id, actor_user_id, action, target_type, target_id, metadata, created_at", {
      count: "exact",
    })
    .eq("workspace_id", params.workspaceId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.actionFilter) {
    query = query.eq("action", params.actionFilter);
  }

  const { data: logs, count } = await query;
  if (!logs || logs.length === 0) {
    return { rows: [], totalCount: count ?? 0, pageSize: PAGE_SIZE };
  }

  const actorIds = [...new Set(logs.map((l) => l.actor_user_id).filter(Boolean))] as string[];
  const { data: actors } =
    actorIds.length > 0
      ? await supabase.from("users").select("id, email").in("id", actorIds)
      : { data: [] };
  const emailById = new Map((actors ?? []).map((a) => [a.id, a.email]));

  return {
    rows: logs.map((l) => ({
      id: l.id,
      actorEmail: l.actor_user_id ? emailById.get(l.actor_user_id) ?? "Unknown" : "System",
      action: l.action as AuditAction,
      targetType: l.target_type,
      targetId: l.target_id,
      metadata: l.metadata,
      createdAt: l.created_at,
    })),
    totalCount: count ?? 0,
    pageSize: PAGE_SIZE,
  };
}

/** Distinct actions that have actually occurred, for the filter dropdown. */
export async function listDistinctAuditActions(workspaceId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("action")
    .eq("workspace_id", workspaceId);

  return [...new Set((data ?? []).map((d) => d.action))].sort();
}
