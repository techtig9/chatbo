import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { authorizeWorkspaceAction } from "@/lib/authz/rbac";
import { toCsv } from "@/lib/utils/csv";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) {
    return new Response("Not signed in", { status: 401 });
  }
  if (!authorizeWorkspaceAction(workspace.role, "audit:read")) {
    return new Response("Not authorized", { status: 403 });
  }

  const actionFilter = request.nextUrl.searchParams.get("action");

  const supabase = createClient();
  let query = supabase
    .from("audit_logs")
    .select("actor_user_id, action, target_type, target_id, created_at")
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: false });

  if (actionFilter) query = query.eq("action", actionFilter);

  const { data: logs } = await query;
  const rows = logs ?? [];

  const actorIds = [...new Set(rows.map((r) => r.actor_user_id).filter(Boolean))] as string[];
  const { data: actors } =
    actorIds.length > 0
      ? await supabase.from("users").select("id, email").in("id", actorIds)
      : { data: [] };
  const emailById = new Map((actors ?? []).map((a) => [a.id, a.email]));

  const csv = toCsv(
    ["timestamp", "actor", "action", "target_type", "target_id"],
    rows.map((r) => [
      r.created_at,
      r.actor_user_id ? emailById.get(r.actor_user_id) ?? "Unknown" : "System",
      r.action,
      r.target_type,
      r.target_id ?? "",
    ])
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="audit-log-${workspace.workspaceId.slice(0, 8)}.csv"`,
    },
  });
}
