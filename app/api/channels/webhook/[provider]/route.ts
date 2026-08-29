import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBotById } from "@/lib/data/bots";
import { processInboundChannelMessage, type ChannelKey } from "@/lib/channels";
import { normalizeProviderEvent, sendProviderReply, type ProviderChannel } from "@/lib/channels/providers";
import { decryptSecret } from "@/lib/tools/integration-config";
import { GatewayExhaustedError } from "@/lib/ai/gateway";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (provider !== "whatsapp") return Response.json({ error: "Verification is not supported for this provider." }, { status: 404 });
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  if (mode !== "subscribe" || !token || !challenge) return Response.json({ error: "Invalid verification request." }, { status: 400 });
  const supabase = createAdminClient();
  const { data: rows } = await supabase.from("channel_connections").select("config").eq("channel", "whatsapp").eq("status", "pending").limit(20);
  const match = (rows ?? []).find((row: any) => String(row.config?.verifyToken ?? "") === token || (() => { try { return decryptSecret(String(row.config?.verifyToken ?? "")) === token; } catch { return false; } })());
  if (!match) return Response.json({ error: "Invalid verify token." }, { status: 403 });
  return new Response(challenge, { status: 200 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!("whatsapp slack discord teams email".split(" ").includes(provider))) return Response.json({ error: "Unsupported provider" }, { status: 404 });
  const raw = await request.text();
  let body: any; try { body = JSON.parse(raw); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const supabase = createAdminClient();
  const { data: connections } = await supabase.from("channel_connections").select("id, bot_id, status, config, secret_encrypted").eq("channel", provider).in("status", ["pending", "connected"]);
  for (const connection of connections ?? []) {
    const config = connection.config ?? {};
    if (provider === "slack") {
      const signature = request.headers.get("x-slack-signature");
      const timestamp = request.headers.get("x-slack-request-timestamp");
      const signingSecret = String((config as any).signingSecret ?? "");
      if (!signature || !timestamp || !signingSecret) continue;
      const secret = signingSecret.startsWith("enc:v1:") ? decryptSecret(signingSecret) : signingSecret;
      const base = `v0:${timestamp}:${raw}`;
      const expected = `v0=${crypto.createHmac("sha256", secret).update(base).digest("hex")}`;
      if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return handle(connection, provider as ProviderChannel, body);
    } else if (provider === "whatsapp") {
      const signature = request.headers.get("x-hub-signature-256");
      const appSecret = String((config as any).appSecret ?? "");
      if (signature && appSecret) { const secret = appSecret.startsWith("enc:v1:") ? decryptSecret(appSecret) : appSecret; const expected = `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`; if (expected !== signature) continue; }
      return handle(connection, provider as ProviderChannel, body);
    } else return handle(connection, provider as ProviderChannel, body);
  }
  return Response.json({ error: "No verified connection matched the event." }, { status: 401 });
}

async function handle(connection: any, provider: ProviderChannel, body: any) {
  const normalized = normalizeProviderEvent(provider, body);
  if (!normalized || !normalized.text || !normalized.externalUserId) return Response.json({ ok: true, ignored: true });
  const bot = await getBotById(connection.bot_id);
  if (!bot) return Response.json({ error: "Agent not found" }, { status: 404 });

  let result;
  try {
    result = await processInboundChannelMessage({ bot, connectionId: connection.id, channel: provider as ChannelKey, externalEventId: normalized.eventId, externalUserId: normalized.externalUserId, text: normalized.text });
  } catch (error) {
    // Never let a raw provider/gateway error crash this webhook handler
    // (the channel provider would otherwise just see an unhandled 500 and
    // may retry indefinitely). Log internally, mark the connection, and
    // acknowledge receipt so the provider stops retrying this event.
    const admin = createAdminClient();
    const technicalMessage = error instanceof GatewayExhaustedError ? error.technicalDetail : error instanceof Error ? error.message : "Agent failed to generate a reply";
    console.error(`[channels/webhook/${provider}] completion failed`, technicalMessage);
    await admin.from("channel_connections").update({ status: "error", last_error: error instanceof GatewayExhaustedError ? error.message : technicalMessage }).eq("id", connection.id);
    return Response.json({ ok: true, delivered: false });
  }

  if (!result.duplicate && result.reply && normalized.replyTarget) {
    try {
      await sendProviderReply(provider, connection.config ?? {}, normalized.replyTarget, result.reply);
      const admin = createAdminClient();
      await admin.from("channel_events").insert({ workspace_id: bot.workspace_id, bot_id: bot.id, connection_id: connection.id, channel: provider, direction: "outbound", external_user_id: normalized.externalUserId, conversation_id: result.conversationId ?? null, payload: { text: result.reply }, status: "sent" });
    } catch (error) {
      const admin = createAdminClient();
      await admin.from("channel_connections").update({ status: "error", last_error: error instanceof Error ? error.message : "Outbound provider delivery failed" }).eq("id", connection.id);
      return Response.json({ error: "Agent replied internally but provider delivery failed." }, { status: 502 });
    }
  }
  return Response.json({ ok: true, ...result });
}
