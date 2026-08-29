import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api-keys/require-auth";
import { apiSendMessageSchema } from "@/lib/validation/api-v1";
import { canAffordAction } from "@/lib/billing/credits";
import { createChatStream } from "@/lib/chat/stream-completion";
import type { ChatHistoryTurn } from "@/lib/chat/assemble";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { auth, errorResponse, rateLimit } = await requireApiAuth(request, "read");
  if (errorResponse) return errorResponse;

  const body = await request.json().catch(() => null);
  const parsed = apiSendMessageSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: bot } = await supabase.from("bots").select("*").eq("id", params.id).eq("workspace_id", auth!.workspaceId).maybeSingle();
  if (!bot) return Response.json({ error: "Bot not found" }, { status: 404 });

  const { data: subscription } = await supabase.from("subscriptions").select("credits_remaining").eq("workspace_id", auth!.workspaceId).maybeSingle();
  if (!subscription || !canAffordAction(subscription.credits_remaining, "messageExchange", false)) {
    return Response.json({ error: "This agent has reached its usage limit for now." }, { status: 402 });
  }

  let conversationId = parsed.data.conversationId;
  if (!conversationId) {
    const { data: conversation, error } = await supabase.from("conversations").insert({ bot_id: bot.id, visitor_id: `api:${auth!.apiKeyId}`, channel: "api" }).select("id").single();
    if (error || !conversation) return Response.json({ error: "Couldn't start conversation" }, { status: 500 });
    conversationId = conversation.id;
  }
  if (!conversationId) return Response.json({ error: "Couldn't resolve conversation" }, { status: 500 });

  const { data: priorMessages } = await supabase.from("messages").select("role, content").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(50);
  const history: ChatHistoryTurn[] = (priorMessages ?? []).map((m) => ({ role: m.role, content: m.content }));

  const stream = createChatStream({
    bot,
    conversationId,
    visitorId: `api:${auth!.apiKeyId}`,
    userMessage: parsed.data.message,
    history,
    persist: true,
    isPlatformAdmin: false,
    firesWebhooks: true,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-RateLimit-Limit": String(rateLimit?.limit ?? 60),
      "X-RateLimit-Remaining": String(rateLimit?.remaining ?? 0),
    },
  });
}
