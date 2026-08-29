import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { runWorkflow } from "@/lib/workflows/engine";

export async function POST(request: NextRequest, { params }: { params: { workflowId: string } }) {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: workflow } = await admin.from("workflows").select("id").eq("id", params.workflowId).eq("workspace_id", workspace.workspaceId).single();
  if (!workflow) return Response.json({ error: "Workflow not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  try { return Response.json(await runWorkflow(params.workflowId, workspace.workspaceId, body && typeof body === "object" ? body : {}, "manual")); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Workflow failed" }, { status: 500 }); }
}
