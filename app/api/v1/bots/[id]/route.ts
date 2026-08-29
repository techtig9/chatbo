import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api-keys/require-auth";
import { apiUpdateBotSchema } from "@/lib/validation/api-v1";
import { logAuditEvent } from "@/lib/audit/log";
import { withRequestLogging, type RequestLogContext } from "@/lib/observability/with-logging";

export const dynamic = "force-dynamic";

export const GET = withRequestLogging(
  "v1/bots/[id]",
  async (request: NextRequest, ctx: RequestLogContext, { params }: { params: { id: string } }) => {
    const { auth, errorResponse } = await requireApiAuth(request, "read");
    if (errorResponse) return errorResponse;
    ctx.workspaceId = auth!.workspaceId;

    const supabase = createAdminClient();
    const { data: bot } = await supabase
      .from("bots")
      .select("id, name, use_case, tone, status, welcome_message, created_at")
      .eq("id", params.id)
      .eq("workspace_id", auth!.workspaceId)
      .maybeSingle();

    if (!bot) {
      return Response.json({ error: "Bot not found" }, { status: 404 });
    }

    return Response.json({ data: bot });
  }
);

export const PATCH = withRequestLogging(
  "v1/bots/[id]",
  async (request: NextRequest, ctx: RequestLogContext, { params }: { params: { id: string } }) => {
    const { auth, errorResponse } = await requireApiAuth(request, "write");
    if (errorResponse) return errorResponse;
    ctx.workspaceId = auth!.workspaceId;

    const parsed = apiUpdateBotSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: bot, error } = await supabase
      .from("bots")
      .update(parsed.data)
      .eq("id", params.id)
      .eq("workspace_id", auth!.workspaceId)
      .select("id, name, status")
      .maybeSingle();

    if (error) {
      return Response.json({ error: "Update failed" }, { status: 500 });
    }
    if (!bot) {
      return Response.json({ error: "Bot not found" }, { status: 404 });
    }

    await logAuditEvent({
      workspaceId: auth!.workspaceId,
      actorUserId: null,
      action: "bot.updated",
      targetType: "bot",
      targetId: bot.id,
      metadata: { viaApi: true, changes: parsed.data },
    });

    return Response.json({ data: bot });
  }
);
