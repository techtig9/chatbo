import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { canAffordAction, upgradeMessage } from "@/lib/billing/credits";
import { createChatStream } from "@/lib/chat/stream-completion";
import { isSameOriginRequest } from "@/lib/security/csrf";
import { z } from "zod";
import type { ChatHistoryTurn } from "@/lib/chat/assemble";

export const runtime = "nodejs";

const playgroundMessageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  // This route is cookie-session-authenticated but is a plain Route
  // Handler, not a Server Action — it doesn't get Next.js's automatic
  // CSRF origin check, so it needs one explicitly. Checked before
  // anything else: no session lookup, no DB query, nothing happens for
  // a cross-origin request.
  if (!isSameOriginRequest(request.headers.get("origin"), request.headers.get("host"))) {
    return Response.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  const parsed = playgroundMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const supabase = createClient();
  // RLS already scopes this to the caller's workspace — a bot from
  // another workspace simply won't be found, not silently leaked.
  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", params.botId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (!bot) {
    return Response.json({ error: "Bot not found" }, { status: 404 });
  }

  if (!canAffordAction(workspace.creditsRemaining, "messageExchange", user.isPlatformAdmin)) {
    return Response.json({ error: upgradeMessage("credits") }, { status: 402 });
  }

  const admin = createAdminClient();
  let activeConversationId = parsed.data.conversationId;
  if (!activeConversationId) {
    const { data: newConversation, error } = await admin
      .from("conversations")
      .insert({ bot_id: bot.id, visitor_id: user.id, channel: "playground" })
      .select("id")
      .single();
    if (error || !newConversation) {
      return Response.json({ error: "Couldn't start test conversation" }, { status: 500 });
    }
    activeConversationId = newConversation.id;
  }

  if (!activeConversationId) {
    return Response.json({ error: "Couldn't resolve conversation" }, { status: 500 });
  }

  const { data: priorMessages } = await admin
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
    visitorId: user.id,
    userMessage: parsed.data.message,
    history,
    persist: true,
    isPlatformAdmin: user.isPlatformAdmin,
    firesWebhooks: false,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
