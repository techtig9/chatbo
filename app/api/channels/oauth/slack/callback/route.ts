import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptConfig } from "@/lib/tools/integration-config";

function validState(state: string, botId: string) { const [id, ts, sig] = state.split("."); const secret = process.env.CHANNEL_OAUTH_SECRET || process.env.TOOL_SECRET_KEY || ""; const expected = crypto.createHmac("sha256", secret).update(botId).digest("hex"); return id === botId && Math.abs(Date.now() - Number(ts)) < 10 * 60 * 1000 && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig || "")); }
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code"), state = request.nextUrl.searchParams.get("state") || ""; const botId = state.split(".")[0];
  if (!code || !botId || !validState(state, botId)) return Response.json({ error: "Invalid OAuth callback." }, { status: 400 });
  const response = await fetch("https://slack.com/api/oauth.v2.access", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.SLACK_CLIENT_ID || "", client_secret: process.env.SLACK_CLIENT_SECRET || "", code, redirect_uri: `${process.env.APP_URL || request.nextUrl.origin}/api/channels/oauth/slack/callback` }) });
  const data = await response.json(); if (!response.ok || !data.ok) return Response.json({ error: data.error || "Slack OAuth failed" }, { status: 502 });
  const supabase = createAdminClient(); const { data: bot } = await supabase.from("bots").select("id,workspace_id").eq("id", botId).single(); if (!bot) return Response.json({ error: "Agent not found" }, { status: 404 });
  await supabase.from("channel_connections").upsert({ workspace_id: bot.workspace_id, bot_id: botId, channel: "slack", name: data.team?.name ? `Slack — ${data.team.name}` : "Slack connection", status: "connected", external_id: data.team?.id || null, config: encryptConfig({ botToken: data.access_token, teamId: data.team?.id, teamName: data.team?.name }), connected_at: new Date().toISOString() }, { onConflict: "bot_id,channel,name" });
  return Response.redirect(`${process.env.APP_URL || request.nextUrl.origin}/dashboard/bots/${botId}/channels?connected=slack`);
}
