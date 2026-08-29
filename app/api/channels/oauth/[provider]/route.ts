import { NextRequest } from "next/server";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

function sign(value: string) { const secret = process.env.CHANNEL_OAUTH_SECRET || process.env.TOOL_SECRET_KEY || ""; return crypto.createHmac("sha256", secret).update(value).digest("hex"); }

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const botId = request.nextUrl.searchParams.get("botId");
  if (!botId) return Response.json({ error: "botId is required" }, { status: 400 });
  if (provider === "slack") {
    const clientId = process.env.SLACK_CLIENT_ID;
    if (!clientId) return Response.json({ error: "SLACK_CLIENT_ID is not configured" }, { status: 503 });
    const state = `${botId}.${Date.now()}.${sign(botId)}`;
    const redirectUri = `${process.env.APP_URL || request.nextUrl.origin}/api/channels/oauth/slack/callback`;
    const url = new URL("https://slack.com/oauth/v2/authorize");
    url.searchParams.set("client_id", clientId); url.searchParams.set("scope", "chat:write,channels:history,groups:history,im:history,mpim:history"); url.searchParams.set("redirect_uri", redirectUri); url.searchParams.set("state", state);
    return Response.redirect(url);
  }
  if (provider === "discord") {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) return Response.json({ error: "DISCORD_CLIENT_ID is not configured" }, { status: 503 });
    const state = `${botId}.${Date.now()}.${sign(botId)}`;
    const redirectUri = `${process.env.APP_URL || request.nextUrl.origin}/api/channels/oauth/discord/callback`;
    const url = new URL("https://discord.com/oauth2/authorize"); url.searchParams.set("client_id", clientId); url.searchParams.set("permissions", "2048"); url.searchParams.set("scope", "bot"); url.searchParams.set("redirect_uri", redirectUri); url.searchParams.set("response_type", "code"); url.searchParams.set("state", state);
    return Response.redirect(url);
  }
  return Response.json({ error: "OAuth is currently available for Slack and Discord." }, { status: 400 });
}
