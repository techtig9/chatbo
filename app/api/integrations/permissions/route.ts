import { NextResponse } from "next/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { authorizeWorkspaceAction } from "@/lib/authz/rbac";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!authorizeWorkspaceAction(workspace.role, "bot:edit")) return NextResponse.json({ error:"Insufficient permissions" }, { status:403 });
  const contentType = request.headers.get("content-type") ?? "";
  const body: Record<string, any> = contentType.includes("application/json") ? await request.json().catch(() => ({})) : Object.fromEntries((await request.formData()).entries());
  if (typeof body.enabled === "string") body.enabled = body.enabled === "true";
  if (typeof body.botId !== "string" || typeof body.connectionId !== "string" || typeof body.enabled !== "boolean") return NextResponse.json({ error:"botId, connectionId and enabled are required" }, { status:400 });
  const supabase = createClient();
  const { data: bot } = await (supabase as any).from("bots").select("id").eq("id", body.botId).eq("workspace_id", workspace.workspaceId).maybeSingle();
  const { data: connection } = await (supabase as any).from("integration_connections").select("id").eq("id", body.connectionId).eq("workspace_id", workspace.workspaceId).maybeSingle();
  if (!bot || !connection) return NextResponse.json({ error:"Bot or integration connection not found" }, { status:404 });
  const { error } = await (supabase as any).from("agent_integration_permissions").upsert({ bot_id:body.botId, connection_id:body.connectionId, enabled:body.enabled }, { onConflict:"bot_id,connection_id" });
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  if (!contentType.includes("application/json")) return NextResponse.redirect(new URL(`/dashboard/integrations/${encodeURIComponent(body.provider ?? "")}`, request.url), 303);
  return NextResponse.json({ ok:true });
}
