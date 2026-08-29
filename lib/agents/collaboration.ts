import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gatewayComplete } from "@/lib/ai/gateway";

export async function listWorkspaceAgents(workspaceId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("bots").select("id,name,description,status,model,system_prompt,agent_config").eq("workspace_id", workspaceId).order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function delegateToAgent(args: { workspaceId: string; sourceBotId: string; targetBotId: string; task: string; context?: Record<string, unknown>; delegationId?: string }) {
  const admin = createAdminClient();
  if (!args.sourceBotId) throw new Error("Agent delegation requires a source agent");
  const { data: relation } = await admin.from("agent_relationships").select("id,max_calls,max_input_chars").eq("workspace_id", args.workspaceId).eq("source_bot_id", args.sourceBotId).eq("target_bot_id", args.targetBotId).eq("enabled", true).single();
  if (!relation) throw new Error("Agent delegation is not allowed between these agents");
  if (args.task.length > Number(relation.max_input_chars || 12000)) throw new Error("Delegated task exceeds the configured input limit");
  const { data: target } = await admin.from("bots").select("id,name,system_prompt,status").eq("id", args.targetBotId).eq("workspace_id", args.workspaceId).single();
  if (!target || target.status === "archived") throw new Error("Target agent is unavailable");
  const { data: usage } = await admin.from("agent_delegations").select("id").eq("workspace_id", args.workspaceId).eq("source_bot_id", args.sourceBotId).eq("target_bot_id", args.targetBotId).gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString());
  if ((usage?.length || 0) >= Number(relation.max_calls || 10)) throw new Error("Agent delegation budget exceeded for this hour");
  const { data: delegation, error: insertError } = await admin.from("agent_delegations").insert({ id: args.delegationId, workspace_id: args.workspaceId, source_bot_id: args.sourceBotId, target_bot_id: args.targetBotId, task: args.task, context: args.context || {}, status: "running" }).select("id").single();
  if (insertError || !delegation) throw new Error(insertError?.message || "Could not create delegation");
  try {
    const response = await gatewayComplete({ system: `${target.system_prompt}\n\nYou are a specialist agent inside Chatbo.ai. Complete only the delegated task. Do not claim external actions were performed unless a tool actually did so. Return a concise result for the supervising agent.`, messages: [{ role: "user", content: `Delegated task:\n${args.task}\n\nContext:\n${JSON.stringify(args.context || {}, null, 2)}` }], mode: "auto" });
    const result = { text: response.text, provider: response.provider, model: response.model, usage: response.usage };
    await admin.from("agent_delegations").update({ status: "succeeded", result, completed_at: new Date().toISOString() }).eq("id", delegation.id);
    return { delegationId: delegation.id, targetAgentId: target.id, targetAgentName: target.name, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delegated agent failed";
    await admin.from("agent_delegations").update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", delegation.id);
    throw error;
  }
}
