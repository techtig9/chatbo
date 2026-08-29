import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api-keys/require-auth";
import { apiSendMessageSchema } from "@/lib/validation/api-v1";
import { canAffordAction, upgradeMessage } from "@/lib/billing/credits";
import { runNonStreamingCompletion } from "@/lib/chat/non-streaming-completion";
import { GatewayExhaustedError } from "@/lib/ai/gateway";
import { triggerWebhookEvent } from "@/lib/webhooks/trigger";
import type { ChatHistoryTurn } from "@/lib/chat/assemble";
import { withRequestLogging, type RequestLogContext } from "@/lib/observability/with-logging";
import { getIdempotentResponse, hashRequestBody, saveIdempotentResponse } from "@/lib/api/v1/idempotency";

export const dynamic = "force-dynamic";

export const POST = withRequestLogging(
  "v1/bots/[id]/messages",
  async (request: NextRequest, ctx: RequestLogContext, { params }: { params: { id: string } }) => {
    const { auth, errorResponse, rateLimit } = await requireApiAuth(request, "read");
    if (errorResponse) return errorResponse;
    ctx.workspaceId = auth!.workspaceId;

  const requestBody = await request.json().catch(() => null);
  const parsed = apiSendMessageSchema.safeParse(requestBody);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 }
    );
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (idempotencyKey) {
    if (idempotencyKey.length > 255) return Response.json({ error: "Idempotency-Key is too long" }, { status: 400 });
    const existing = await getIdempotentResponse({ workspaceId: auth!.workspaceId, apiKeyId: auth!.apiKeyId, key: idempotencyKey, requestHash: hashRequestBody(requestBody) });
    if (existing?.conflict) return Response.json({ error: "Idempotency-Key was already used with a different request" }, { status: 409 });
    if (existing?.response) return existing.response;
  }

  const supabase = createAdminClient();
  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", params.id)
    .eq("workspace_id", auth!.workspaceId)
    .maybeSingle();

  if (!bot) {
    return Response.json({ error: "Bot not found" }, { status: 404 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("credits_remaining")
    .eq("workspace_id", auth!.workspaceId)
    .maybeSingle();

  if (!subscription || !canAffordAction(subscription.credits_remaining, "apiRequest", false)) {
    return Response.json({ error: upgradeMessage("credits") }, { status: 402 });
  }

  let conversationId = parsed.data.conversationId;
  if (!conversationId) {
    const { data: newConversation, error } = await supabase
      .from("conversations")
      .insert({ bot_id: bot.id, visitor_id: `api:${auth!.apiKeyId}`, channel: "api" })
      .select("id")
      .single();
    if (error || !newConversation) {
      return Response.json({ error: "Couldn't start conversation" }, { status: 500 });
    }
    conversationId = newConversation.id;
    await triggerWebhookEvent(bot.workspace_id, "conversation.started", {
      conversationId,
      botId: bot.id,
      channel: "api",
    });
  }

  if (!conversationId) {
    return Response.json({ error: "Couldn't resolve conversation" }, { status: 500 });
  }

  const { data: priorMessages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(50);

  const history: ChatHistoryTurn[] = (priorMessages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const result = await runNonStreamingCompletion(bot, conversationId, parsed.data.message, history);
    const payload = { data: result };
    if (idempotencyKey) await saveIdempotentResponse({ workspaceId: auth!.workspaceId, apiKeyId: auth!.apiKeyId, key: idempotencyKey, requestHash: hashRequestBody(requestBody), responseStatus: 200, responseBody: payload });
    return Response.json(payload, { headers: { "X-RateLimit-Limit": String(rateLimit?.limit ?? 60), "X-RateLimit-Remaining": String(rateLimit?.remaining ?? 0) } });
  } catch (err) {
    // GatewayExhaustedError already carries a friendly, user-safe message.
    // Any other error is logged internally and given a generic message so
    // raw provider/internal detail never reaches an API consumer.
    if (err instanceof GatewayExhaustedError) {
      console.error("[api/v1/messages] AI gateway exhausted", { botId: params.id, detail: err.technicalDetail });
      return Response.json({ error: err.message }, { status: 502 });
    }
    console.error("[api/v1/messages] generation failed", err);
    return Response.json({ error: "Generation failed. Please try again." }, { status: 502 });
  }
  }
);
