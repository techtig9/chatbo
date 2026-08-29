import { NextResponse } from "next/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { authorizeWorkspaceAction } from "@/lib/authz/rbac";
import { executeIntegrationAction } from "@/lib/integrations/execute";

export async function POST(request: Request) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  if (!authorizeWorkspaceAction(workspace.role, "bot:edit")) return NextResponse.json({ error:"Insufficient permissions" }, { status:403 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.botId !== "string" || typeof body.connectionId !== "string" || typeof body.action !== "string" || typeof body.payload !== "object" || body.payload === null) return NextResponse.json({ error:"botId, connectionId, action and payload are required" }, { status:400 });
  try {
    const result = await executeIntegrationAction({ workspaceId:workspace.workspaceId, botId:body.botId, connectionId:body.connectionId, action:body.action, payload:body.payload });
    return NextResponse.json({ ok:true, result });
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : "Integration action failed" }, { status:400 });
  }
}
