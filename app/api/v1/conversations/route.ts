import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api-keys/require-auth";
import { withRequestLogging, type RequestLogContext } from "@/lib/observability/with-logging";

export const dynamic = "force-dynamic";

export const GET = withRequestLogging("v1/conversations", async (request: NextRequest, ctx: RequestLogContext) => {
  const { auth, errorResponse } = await requireApiAuth(request, "read");
  if (errorResponse) return errorResponse;
  ctx.workspaceId = auth!.workspaceId;

  const supabase = createAdminClient();

  const { data: bots } = await supabase
    .from("bots")
    .select("id")
    .eq("workspace_id", auth!.workspaceId);
  const botIds = (bots ?? []).map((b) => b.id);

  if (botIds.length === 0) {
    return Response.json({ data: [] });
  }

  const botIdParam = request.nextUrl.searchParams.get("botId");
  const targetBotIds = botIdParam ? botIds.filter((id) => id === botIdParam) : botIds;

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, bot_id, channel, started_at, ended_at")
    .in("bot_id", targetBotIds)
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) {
    return Response.json({ error: "Failed to list conversations" }, { status: 500 });
  }

  return Response.json({ data: conversations ?? [] });
});
