"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getBotById } from "@/lib/data/bots";
import { requireWorkspaceAction, WorkspaceAuthorizationError } from "@/lib/authz/rbac";
import { logAuditEvent } from "@/lib/audit/log";

async function auth(botId: string) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");
  try { requireWorkspaceAction(workspace.role, "bot:publish"); }
  catch (err) {
    if (err instanceof WorkspaceAuthorizationError) throw new Error("Your role doesn't allow deployment changes.");
    throw err;
  }
  const bot = await getBotById(botId);
  if (!bot || bot.workspace_id !== workspace.workspaceId) throw new Error("Agent not found.");
  return { user, workspace, bot };
}

export async function deployBot(botId: string, environment: "staging" | "production") {
  const { user, workspace, bot } = await auth(botId);
  const supabase = createClient();
  const { data: latest } = await supabase.from("bot_versions").select("version_number").eq("bot_id", botId).order("version_number", { ascending: false }).limit(1).maybeSingle();
  const versionNumber = (latest?.version_number ?? 0) + 1;
  const snapshot = {
    name: bot.name, description: bot.description, use_case: bot.use_case, tone: bot.tone,
    fallback_behavior: bot.fallback_behavior, system_prompt: bot.system_prompt, agent_config: bot.agent_config,
    model: bot.model, avatar: bot.avatar, brand_color: bot.brand_color, welcome_message: bot.welcome_message,
    widget_position: bot.widget_position, allowed_domains: bot.allowed_domains, starter_questions: bot.starter_questions,
  };
  const { data: version, error: versionError } = await supabase.from("bot_versions").insert({ bot_id: botId, workspace_id: workspace.workspaceId, version_number: versionNumber, snapshot, created_by: user?.id ?? null }).select("id").single();
  if (versionError || !version) throw new Error("Couldn't create deployment version.");

  await supabase.from("bot_deployments").update({ status: "rolled_back", rolled_back_at: new Date().toISOString() }).eq("bot_id", botId).eq("environment", environment).eq("status", "active");
  const { error: deploymentError } = await supabase.from("bot_deployments").insert({ bot_id: botId, workspace_id: workspace.workspaceId, environment, version_id: version.id, status: "active", deployed_by: user?.id ?? null });
  if (deploymentError) throw new Error("Couldn't create deployment.");
  if (environment === "production") await supabase.from("bots").update({ status: "published" }).eq("id", botId).eq("workspace_id", workspace.workspaceId);
  revalidatePath(`/dashboard/bots/${botId}/deployment`);
  revalidatePath(`/dashboard/bots/${botId}/publish`);
  await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user?.id ?? null, action: `bot.deployed.${environment}`, targetType: "bot", targetId: botId, metadata: { versionNumber } });
}

export async function rollbackDeployment(botId: string, environment: "staging" | "production") {
  const { user, workspace } = await auth(botId);
  const supabase = createClient();
  const { data: deployments } = await supabase.from("bot_deployments").select("id, version_id, deployed_at").eq("bot_id", botId).eq("environment", environment).order("deployed_at", { ascending: false }).limit(3);
  const previous = deployments?.find((d, i) => i === 1);
  if (!previous?.version_id) throw new Error("No previous deployment is available for rollback.");
  await supabase.from("bot_deployments").update({ status: "rolled_back", rolled_back_at: new Date().toISOString() }).eq("bot_id", botId).eq("environment", environment).eq("status", "active");
  const { error } = await supabase.from("bot_deployments").insert({ bot_id: botId, workspace_id: workspace.workspaceId, environment, version_id: previous.version_id, status: "active", deployed_by: user?.id ?? null });
  if (error) throw new Error("Rollback failed.");
  if (environment === "production") await supabase.from("bots").update({ status: "published" }).eq("id", botId).eq("workspace_id", workspace.workspaceId);
  revalidatePath(`/dashboard/bots/${botId}/deployment`);
  await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user?.id ?? null, action: `bot.rollback.${environment}`, targetType: "bot", targetId: botId });
}

export async function addBotDomain(botId: string, formData: FormData) {
  const { user, workspace } = await auth(botId);
  const hostname = String(formData.get("hostname") ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)) throw new Error("Enter a valid hostname.");
  const token = `chatbo-verify-${crypto.randomUUID()}`;
  const supabase = createClient();
  const { error } = await supabase.from("bot_domains").insert({ bot_id: botId, workspace_id: workspace.workspaceId, hostname, verification_token: token });
  if (error) throw new Error(error.code === "23505" ? "That domain is already connected." : "Couldn't add domain.");
  revalidatePath(`/dashboard/bots/${botId}/deployment`);
  await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user?.id ?? null, action: "bot.domain.added", targetType: "bot", targetId: botId, metadata: { hostname } });
}
