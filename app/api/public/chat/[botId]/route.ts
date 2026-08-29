import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOriginAllowed } from "@/lib/chat/origin-check";
import { publicChatRateLimiter } from "@/lib/chat/rate-limit";
import { canAffordAction } from "@/lib/billing/credits";
import { createChatStream } from "@/lib/chat/stream-completion";
import { triggerWebhookEvent } from "@/lib/webhooks/trigger";
import { chatMessageSchema } from "@/lib/validation/chat";
import type { ChatHistoryTurn } from "@/lib/chat/assemble";

export const runtime = "nodejs";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers });
  }

  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400, headers }
    );
  }
  const { message, conversationId, visitorId, channel } = parsed.data;

  const supabase = createAdminClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", params.botId)
    .maybeSingle();

  if (!bot || bot.status !== "published") {
    return Response.json({ error: "Bot not found" }, { status: 404, headers });
  }

  // Hard Constraint #7: rate limit before any Claude/Voyage call.
  const rateLimit = await publicChatRateLimiter.checkAndRecord(`${bot.id}:${visitorId}`);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many messages. Please wait a moment and try again." },
      { status: 429, headers: { ...headers, "Retry-After": "60" } }
    );
  }

  if (channel === "widget" && !isOriginAllowed(origin, bot.allowed_domains)) {
    return Response.json(
      { error: "This domain is not allowed to embed this bot." },
      { status: 403, headers }
    );
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("credits_remaining")
    .eq("workspace_id", bot.workspace_id)
    .maybeSingle();

  if (!subscription || !canAffordAction(subscription.credits_remaining, "messageExchange", false)) {
    return Response.json(
      { error: "This bot has reached its usage limit for now." },
      { status: 402, headers }
    );
  }

  let activeConversationId = conversationId;
  if (!activeConversationId) {
    const { data: newConversation, error: convError } = await supabase
      .from("conversations")
      .insert({ bot_id: bot.id, visitor_id: visitorId, channel })
      .select("id")
      .single();
    if (convError || !newConversation) {
      return Response.json({ error: "Couldn't start conversation" }, { status: 500, headers });
    }
    activeConversationId = newConversation.id;
    await triggerWebhookEvent(bot.workspace_id, "conversation.started", {
      conversationId: activeConversationId,
      botId: bot.id,
      channel,
    });
  }

  if (!activeConversationId) {
    // Unreachable in practice — the block above always sets this or
    // returns early — but an explicit check here is cheaper than a
    // confusing runtime error if that ever stops being true.
    return Response.json({ error: "Couldn't resolve conversation" }, { status: 500, headers });
  }

  const { data: priorMessages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", activeConversationId)
    .order("created_at", { ascending: true })
    .limit(50);

  const history: ChatHistoryTurn[] = (priorMessages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const stream = createChatStream({
    bot,
    conversationId: activeConversationId,
    visitorId,
    userMessage: message,
    history,
    persist: true,
    isPlatformAdmin: false,
    firesWebhooks: true,
  });

  return new Response(stream, {
    headers: {
      ...headers,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
