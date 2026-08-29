import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getOrganizationForWorkspace } from "@/lib/enterprise";
import { authorizeWorkspaceAction } from "@/lib/authz/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!authorizeWorkspaceAction(workspace.role, "audit:read")) return Response.json({ error: "Not authorized" }, { status: 403 });
  const org = await getOrganizationForWorkspace(workspace.workspaceId);
  if (!org) return Response.json({ error: "Organization not configured" }, { status: 404 });

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 100), 500);
  const eventType = request.nextUrl.searchParams.get("eventType");
  const supabase = createClient();
  let query = supabase.from("organization_audit_events").select("id,actor_user_id,event_type,action,target_type,target_id,result,ip_address,user_agent,metadata,created_at").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(limit);
  if (eventType) query = query.eq("event_type", eventType);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ events: data ?? [] });
}
