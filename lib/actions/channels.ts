"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { getBotById } from "@/lib/data/bots";
import { requireWorkspaceAction, WorkspaceAuthorizationError } from "@/lib/authz/rbac";
import { createWebhookSecret } from "@/lib/channels";
import { encryptConfig, decryptConfig } from "@/lib/tools/integration-config";
import { PROVIDER_SETUP, type ProviderChannel } from "@/lib/channels/providers";

async function auth(botId: string) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");
  try { requireWorkspaceAction(workspace.role, "bot:publish"); } catch (e) { if (e instanceof WorkspaceAuthorizationError) throw new Error("Your role doesn't allow channel changes."); throw e; }
  const bot = await getBotById(botId);
  if (!bot || bot.workspace_id !== workspace.workspaceId) throw new Error("Agent not found.");
  return { user, workspace, bot };
}

export async function saveChannelConnection(botId: string, formData: FormData) {
  const { workspace } = await auth(botId);
  const channel = String(formData.get("channel") ?? "");
  const name = String(formData.get("name") ?? "").trim() || "Default connection";
  const submitted = JSON.parse(String(formData.get("config") ?? "{}"));
  if (!(channel in PROVIDER_SETUP)) throw new Error("Unsupported provider channel.");
  const supabase = createClient();
  const { data: existing } = await supabase.from("channel_connections").select("config").eq("bot_id", botId).eq("workspace_id", workspace.workspaceId).eq("channel", channel).eq("name", name).maybeSingle();
  const current = existing?.config ? decryptConfig(existing.config as Record<string, unknown>) : {};
  const config = Object.fromEntries(Object.entries(submitted).map(([key, value]) => [key, value === "***" ? current[key] : value]));
  const required = PROVIDER_SETUP[channel as ProviderChannel].required;
  if (channel !== "discord" && channel !== "email") {
    const missing = required.filter((key) => !String(config[key] ?? "").trim());
    if (missing.length) throw new Error(`Missing provider fields: ${missing.join(", ")}`);
  }
  const secret = createWebhookSecret();
  const { error } = await supabase.from("channel_connections").upsert({ workspace_id: workspace.workspaceId, bot_id: botId, channel, name, status: "pending", config: encryptConfig(config), secret_encrypted: secret }, { onConflict: "bot_id,channel,name" });
  if (error) throw new Error("Couldn't save channel connection.");
  revalidatePath(`/dashboard/bots/${botId}/channels`);
}

export async function setChannelStatus(botId: string, connectionId: string, status: "connected" | "paused" | "disconnected") {
  const { workspace } = await auth(botId);
  const supabase = createClient();
  const { error } = await supabase.from("channel_connections").update({ status, connected_at: status === "connected" ? new Date().toISOString() : null }).eq("id", connectionId).eq("bot_id", botId).eq("workspace_id", workspace.workspaceId);
  if (error) throw new Error("Couldn't update channel status.");
  revalidatePath(`/dashboard/bots/${botId}/channels`);
}
