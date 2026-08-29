import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runWorkflow } from "@/lib/workflows/engine";
import { authenticateApiKey } from "@/lib/api-keys/authenticate";

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request.headers.get("authorization"));
  if (!auth) return Response.json({ error: "Invalid or missing API key" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const workflowId = String(body.workflowId || "");
  if (!workflowId) return Response.json({ error: "workflowId is required" }, { status: 400 });
  const admin = createAdminClient();
  const { data: workflow } = await admin.from("workflows").select("id,workspace_id,status,trigger_type").eq("id", workflowId).eq("workspace_id", auth.workspaceId).single();
  if (!workflow) return Response.json({ error: "Workflow not found" }, { status: 404 });
  if (workflow.status !== "active") return Response.json({ error: "Workflow is not active" }, { status: 409 });
  try { const result = await runWorkflow(workflowId, auth.workspaceId, body.input && typeof body.input === "object" ? body.input : body, "webhook"); return Response.json(result); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Workflow failed" }, { status: 500 }); }
}
