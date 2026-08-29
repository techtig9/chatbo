"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { workspaceOrRedirect } from "@/lib/actions/workspace-switch";
import { orchestrateAgents, type OrchestrationMode } from "@/lib/agents/orchestration";
import { toUserMessage } from "@/lib/errors/user-facing";

export async function runMultiAgentOrchestration(formData: FormData) {
  const workspace = await workspaceOrRedirect();
  const sourceBotId = String(formData.get("sourceBotId") || "");
  const task = String(formData.get("task") || "").trim();
  const mode = String(formData.get("mode") || "supervisor") as OrchestrationMode;
  if (!sourceBotId || !task) redirect("/dashboard/multi-agent/orchestration?error=Supervisor and task are required");
  try {
    const result = await orchestrateAgents({ workspaceId: workspace.workspaceId, sourceBotId, task, mode });
    revalidatePath("/dashboard/multi-agent/orchestration");
    redirect(`/dashboard/multi-agent/orchestration?success=${encodeURIComponent(`Run ${result.runId} completed`)}`);
  } catch (error) {
    console.error(`[orchestration] run failed for source bot ${sourceBotId}`, error);
    redirect(`/dashboard/multi-agent/orchestration?error=${encodeURIComponent(toUserMessage(error, "run this orchestration"))}`);
  }
}
