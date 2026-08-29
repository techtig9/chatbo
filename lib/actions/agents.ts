"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceOrRedirect } from "@/lib/actions/workspace-switch";

export async function createAgentRelationship(formData: FormData) {
  const workspace = await workspaceOrRedirect(); const admin = createAdminClient();
  const sourceBotId = String(formData.get("sourceBotId") || ""); const targetBotId = String(formData.get("targetBotId") || "");
  if (!sourceBotId || !targetBotId || sourceBotId === targetBotId) redirect("/dashboard/multi-agent?error=Choose two different agents");
  const { error } = await admin.from("agent_relationships").upsert({ workspace_id: workspace.workspaceId, source_bot_id: sourceBotId, target_bot_id: targetBotId, role: String(formData.get("role") || "specialist"), max_calls: Math.max(1, Math.min(100, Number(formData.get("maxCalls") || 10))), max_input_chars: Math.max(100, Math.min(50000, Number(formData.get("maxInputChars") || 12000))), enabled: true }, { onConflict: "workspace_id,source_bot_id,target_bot_id" });
  if (error) redirect(`/dashboard/multi-agent?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/multi-agent");
  redirect("/dashboard/multi-agent?success=Agent relationship saved");
}

export async function setAgentRelationshipEnabled(id: string, enabled: boolean) {
  const workspace = await workspaceOrRedirect(); const admin = createAdminClient();
  await admin.from("agent_relationships").update({ enabled }).eq("id", id).eq("workspace_id", workspace.workspaceId);
  revalidatePath("/dashboard/multi-agent");
}

export async function deleteAgentRelationship(id: string) {
  const workspace = await workspaceOrRedirect(); const admin = createAdminClient();
  await admin.from("agent_relationships").delete().eq("id", id).eq("workspace_id", workspace.workspaceId);
  revalidatePath("/dashboard/multi-agent");
}
