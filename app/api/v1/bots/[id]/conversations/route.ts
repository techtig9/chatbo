import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api-keys/require-auth";
import { withRequestLogging, type RequestLogContext } from "@/lib/observability/with-logging";

export const dynamic = "force-dynamic";

export const POST = withRequestLogging(
  "v1/bots/[id]/conversations",
  async (request: NextRequest, ctx: RequestLogContext, { params }: { params: { id: string } }) => {
    const { auth, errorResponse } = await requireApiAuth(request, "read");
    if (errorResponse) return errorResponse;
    ctx.workspaceId = auth!.workspaceId;

    const body = await request.json().catch(() => ({}));
    const visitorId = typeof body.visitorId === "string" && body.visitorId.trim()
      ? body.visitorId.trim().slice(0, 200)
      : `api:${auth!.apiKeyId}`;

    const supabase = createAdminClient();
    const { data: bot } = await supabase.from("bots").select("id").eq("id", params.id).eq("workspace_id", auth!.workspaceId).maybeSingle();
    if (!bot) return Response.json({ error: "Bot not found" }, { status: 404 });

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({ bot_id: bot.id, visitor_id: visitorId, channel: "api" })
      .select("id, bot_id, channel, started_at, ended_at")
      .single();
    if (error || !conversation) return Response.json({ error: "Couldn't create conversation" }, { status: 500 });

    return Response.json({ data: conversation }, { status: 201 });
  }
);
