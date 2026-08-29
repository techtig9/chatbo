import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBotById } from "@/lib/data/bots";
import { processInboundChannelMessage, verifyChannelSignature, type ChannelKey } from "@/lib/channels";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ channel: string; botId: string }> }) {
  const { channel, botId } = await params;
  if (!(["whatsapp", "slack", "discord", "teams", "email"].includes(channel))) return Response.json({ error: "Unsupported channel" }, { status: 404 });
  const raw = await request.text();
  const supabase = createAdminClient();
  const { data: connection } = await supabase.from("channel_connections").select("id, status, secret_encrypted, config").eq("bot_id", botId).eq("channel", channel).in("status", ["pending", "connected"]).limit(1).maybeSingle();
  if (!connection) return Response.json({ error: "Channel is not connected" }, { status: 404 });
  const signature = request.headers.get("x-chatbo-signature");
  if (connection.secret_encrypted && !verifyChannelSignature(raw, signature, connection.secret_encrypted)) return Response.json({ error: "Invalid signature" }, { status: 401 });
  let body: any;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const text = String(body.text ?? body.message?.text ?? body.event?.text ?? "").trim();
  const externalUserId = String(body.externalUserId ?? body.user?.id ?? body.sender?.id ?? "").trim();
  if (!text || !externalUserId) return Response.json({ error: "Missing message text or external user id" }, { status: 400 });
  const bot = await getBotById(botId);
  if (!bot) return Response.json({ error: "Agent not found" }, { status: 404 });
  try {
    const result = await processInboundChannelMessage({ bot, connectionId: connection.id, channel: channel as ChannelKey, externalEventId: String(body.eventId ?? body.id ?? "") || undefined, externalUserId, text });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Channel processing failed" }, { status: 500 });
  }
}
