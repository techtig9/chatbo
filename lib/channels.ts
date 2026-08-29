import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { runNonStreamingCompletion } from "@/lib/chat/non-streaming-completion";
import { canAffordAction } from "@/lib/billing/credits";
import type { BotRow } from "@/lib/data/bots";

export const CHANNELS = [
  { key: "web", name: "Website widget", description: "Embed the agent directly on your website.", icon: "Globe", mode: "native" },
  { key: "hosted", name: "Hosted chat", description: "Share a branded Chatbo-hosted conversation page.", icon: "MessageCircle", mode: "native" },
  { key: "api", name: "API", description: "Connect your own applications through the Chatbo API.", icon: "Code2", mode: "native" },
  { key: "whatsapp", name: "WhatsApp", description: "Connect WhatsApp Business through a verified webhook and access token.", icon: "Smartphone", mode: "connector" },
  { key: "slack", name: "Slack", description: "Install the agent in Slack channels or direct messages.", icon: "Hash", mode: "connector" },
  { key: "discord", name: "Discord", description: "Connect the agent to Discord servers and threads.", icon: "Gamepad2", mode: "connector" },
  { key: "teams", name: "Microsoft Teams", description: "Prepare an enterprise Teams bot connection.", icon: "Users", mode: "connector" },
  { key: "email", name: "Email", description: "Route inbound email conversations to the agent.", icon: "Mail", mode: "connector" },
] as const;

export type ChannelKey = typeof CHANNELS[number]["key"];

export function createWebhookSecret() {
  return crypto.randomBytes(32).toString("hex");
}

export function verifyChannelSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signature.replace(/^sha256=/, "");
  return provided.length === expected.length && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function processInboundChannelMessage({
  bot,
  connectionId,
  channel,
  externalEventId,
  externalUserId,
  text,
}: {
  bot: BotRow;
  connectionId?: string;
  channel: ChannelKey;
  externalEventId?: string;
  externalUserId: string;
  text: string;
}) {
  const supabase = createAdminClient();
  if (externalEventId) {
    const { data: duplicate } = await supabase.from("channel_events").select("id").eq("channel", channel).eq("external_event_id", externalEventId).maybeSingle();
    if (duplicate) return { duplicate: true };
  }

  let conversationId: string | undefined;
  const { data: existing } = await supabase.from("conversations").select("id").eq("bot_id", bot.id).eq("visitor_id", externalUserId).is("ended_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (existing?.id) conversationId = existing.id;
  if (!conversationId) {
    const { data: conversation } = await supabase.from("conversations").insert({ bot_id: bot.id, channel, visitor_id: externalUserId }).select("id").single();
    conversationId = conversation?.id;
  }
  if (!conversationId) throw new Error("Unable to create channel conversation.");

  const { data: event } = await supabase.from("channel_events").insert({ workspace_id: bot.workspace_id, bot_id: bot.id, connection_id: connectionId ?? null, channel, direction: "inbound", external_event_id: externalEventId ?? null, external_user_id: externalUserId, conversation_id: conversationId, payload: { text }, status: "received" }).select("id").single();

  // Every other chat entry point (widget, playground, public v1 API)
  // checks credits BEFORE calling the AI gateway — this one didn't, which
  // meant a workspace at 0 credits could still get unlimited free AI
  // replies through any connected channel (Slack/WhatsApp/Discord/Teams/
  // email), since spendCreditsAtomic only runs (and its failure is
  // ignored) at the very end of runNonStreamingCompletion, after the
  // costly generation already happened.
  const { data: subscription } = await supabase.from("subscriptions").select("credits_remaining").eq("workspace_id", bot.workspace_id).maybeSingle();
  if (!subscription || !canAffordAction(subscription.credits_remaining, "apiRequest", false)) {
    if (event?.id) await supabase.from("channel_events").update({ status: "processed" }).eq("id", event.id);
    return { duplicate: false, conversationId, reply: "This agent has reached its usage limit for now. Please try again later." };
  }

  const historyResult = await supabase.from("messages").select("role, content").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(30);
  const history = (historyResult.data ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const result = await runNonStreamingCompletion(bot, conversationId, text, history);
  if (event?.id) await supabase.from("channel_events").update({ status: "processed" }).eq("id", event.id);
  return { duplicate: false, conversationId, reply: result.reply };
}
