"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { requireWorkspaceAction } from "@/lib/authz/rbac";
import { getToolDefinition } from "@/lib/tools/registry";
import { logAuditEvent } from "@/lib/audit/log";
export async function setAgentTool(botId:string,toolKey:string,enabled:boolean){const {user,workspace}=await getCurrentUserAndWorkspace();if(!user||!workspace)throw new Error("Not signed in.");requireWorkspaceAction(workspace.role,"bot:edit");const tool=getToolDefinition(toolKey);if(!tool)throw new Error("Unknown tool.");const supabase=createClient();const {error}=await supabase.from("agent_tools").upsert({bot_id:botId,tool_key:toolKey,enabled,permission:tool.permission},{onConflict:"bot_id,tool_key"});if(error)throw new Error(error.message);await logAuditEvent({workspaceId:workspace.workspaceId,actorUserId:user.id,action:enabled?"agent_tool.enabled":"agent_tool.disabled",targetType:"agent_tool",targetId:botId,metadata:{toolKey}});revalidatePath(`/dashboard/bots/${botId}/edit`);return{success:true};}

export async function configureAgentTool(botId: string, toolKey: string, config: Record<string, unknown>) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) throw new Error("Not signed in.");
  requireWorkspaceAction(workspace.role, "bot:edit");
  const tool = getToolDefinition(toolKey);
  if (!tool) throw new Error("Unknown tool.");
  const { encryptConfig } = await import("@/lib/tools/integration-config");
  const supabase = createClient();
  const { error } = await supabase.from("agent_tools").upsert({
    bot_id: botId,
    tool_key: toolKey,
    enabled: true,
    permission: tool.permission,
    config: encryptConfig(config),
  }, { onConflict: "bot_id,tool_key" });
  if (error) throw new Error(error.message);
  await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user.id, action: "agent_tool.configured", targetType: "agent_tool", targetId: botId, metadata: { toolKey } });
  revalidatePath(`/dashboard/bots/${botId}/edit`);
  return { success: true };
}
