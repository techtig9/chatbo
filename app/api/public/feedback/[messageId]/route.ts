import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { feedbackSchema } from "@/lib/validation/feedback";
import { triggerWebhookEvent } from "@/lib/webhooks/trigger";

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
  { params }: { params: { messageId: string } }
) {
  const headers = corsHeaders(request.headers.get("origin"));

  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid feedback value" }, { status: 400, headers });
  }

  const supabase = createAdminClient();

  // Only lets feedback be set on messages that actually exist and are
  // from the assistant — a visitor thumbs-down on their own message
  // wouldn't mean anything, and this also blocks feedback spam against
  // arbitrary message IDs from mattering (it's a no-op update if the
  // row doesn't match).
  const { data, error } = await supabase
    .from("messages")
    .update({ feedback: parsed.data.feedback })
    .eq("id", params.messageId)
    .eq("role", "assistant")
    .select("id, conversation_id")
    .maybeSingle();

  if (error) {
    return Response.json({ error: "Couldn't save feedback" }, { status: 500, headers });
  }
  if (!data) {
    return Response.json({ error: "Message not found" }, { status: 404, headers });
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("bot_id, bots(workspace_id)")
    .eq("id", data.conversation_id)
    .maybeSingle();

  const botsRelation = conversation?.bots as unknown;
  const workspaceId = (Array.isArray(botsRelation) ? botsRelation[0] : botsRelation) as
    | { workspace_id: string }
    | null;

  if (workspaceId) {
    await triggerWebhookEvent(workspaceId.workspace_id, "feedback.submitted", {
      messageId: data.id,
      conversationId: data.conversation_id,
      feedback: parsed.data.feedback,
    });
  }

  return Response.json({ success: true }, { headers });
}
