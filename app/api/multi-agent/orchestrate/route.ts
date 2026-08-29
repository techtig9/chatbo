import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { orchestrateAgents } from "@/lib/agents/orchestration";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const sourceBotId = String(body.sourceBotId || "");
  const task = String(body.task || "").trim();
  if (!sourceBotId || !task) return NextResponse.json({ error: "sourceBotId and task are required" }, { status: 400 });
  const admin = createAdminClient();
  const { data: bot } = await admin.from("bots").select("id").eq("id", sourceBotId).eq("workspace_id", workspace.workspaceId).single();
  if (!bot) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  const key = req.headers.get("idempotency-key") || undefined;
  if (key) {
    const { data: existing } = await (admin as any).from("multi_agent_runs").select("id,status,final_result,results,plan,total_cost_usd,error").eq("workspace_id", workspace.workspaceId).eq("idempotency_key", key).maybeSingle();
    if (existing) return NextResponse.json({ ...existing, replayed: true }, { status: existing.status === "failed" ? 422 : 200 });
  }
  try {
    const result = await orchestrateAgents({ workspaceId: workspace.workspaceId, sourceBotId, task, mode: body.mode, context: body.context, depth: Number(body.depth || 0), idempotencyKey: key });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Orchestration failed" }, { status: 422 });
  }
}
