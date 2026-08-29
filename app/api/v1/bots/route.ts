import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAuth } from "@/lib/api-keys/require-auth";
import { apiCreateBotSchema } from "@/lib/validation/api-v1";
import { canCreateBot, canAffordAction } from "@/lib/billing/credits";
import { spendCreditsAtomic } from "@/lib/billing/spend";
import { synthesizeBotPrompt } from "@/lib/ai/synthesize-bot";
import { logAuditEvent } from "@/lib/audit/log";
import { withRequestLogging, type RequestLogContext } from "@/lib/observability/with-logging";

export const dynamic = "force-dynamic";

export const GET = withRequestLogging("v1/bots", async (request: NextRequest, ctx: RequestLogContext) => {
  const { auth, errorResponse } = await requireApiAuth(request, "read");
  if (errorResponse) return errorResponse;
  ctx.workspaceId = auth!.workspaceId;

  const supabase = createAdminClient();
  const { data: bots, error } = await supabase
    .from("bots")
    .select("id, name, use_case, tone, status, created_at")
    .eq("workspace_id", auth!.workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Failed to list bots" }, { status: 500 });
  }

  return Response.json({ data: bots ?? [] });
});

export const POST = withRequestLogging("v1/bots", async (request: NextRequest, ctx: RequestLogContext) => {
  const { auth, errorResponse } = await requireApiAuth(request, "write");
  if (errorResponse) return errorResponse;
  ctx.workspaceId = auth!.workspaceId;

  const parsed = apiCreateBotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, credits_remaining")
    .eq("workspace_id", auth!.workspaceId)
    .maybeSingle();
  const { count: currentBotCount } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", auth!.workspaceId);

  if (!canCreateBot(currentBotCount ?? 0, subscription?.plan ?? "free")) {
    return Response.json({ error: "Bot limit reached for this plan" }, { status: 402 });
  }

  // synthesizeBotPrompt below is a real AI gateway call — see the matching
  // fix in lib/actions/bots.ts for why this check is here.
  if (!subscription || !canAffordAction(subscription.credits_remaining, "promptRegeneration", false)) {
    return Response.json({ error: "This workspace is out of credits for this billing period." }, { status: 402 });
  }

  let synthesis;
  try {
    synthesis = await synthesizeBotPrompt({
      botName: parsed.data.name,
      useCase: parsed.data.useCase,
      tone: parsed.data.tone,
      fallbackBehavior: parsed.data.fallbackBehavior,
      businessContext: parsed.data.businessContext,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bot generation failed";
    return Response.json({ error: message }, { status: 502 });
  }
  await spendCreditsAtomic(auth!.workspaceId, "promptRegeneration");

  // API-created bots have no human `created_by` — the workspace owner
  // is recorded instead so the FK constraint (created_by references
  // users, not null) still resolves to someone real and accountable.
  const { data: workspaceRow } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", auth!.workspaceId)
    .single();

  const { data: bot, error: insertError } = await supabase
    .from("bots")
    .insert({
      workspace_id: auth!.workspaceId,
      created_by: workspaceRow!.owner_id,
      name: parsed.data.name,
      use_case: parsed.data.useCase,
      tone: parsed.data.tone,
      fallback_behavior: parsed.data.fallbackBehavior,
      system_prompt: synthesis.systemPrompt,
      starter_questions: synthesis.starterQuestions,
      welcome_message: synthesis.welcomeMessage,
      status: "draft",
    })
    .select("id, name, status")
    .single();

  if (insertError || !bot) {
    return Response.json({ error: "Bot generated but couldn't be saved" }, { status: 500 });
  }

  await logAuditEvent({
    workspaceId: auth!.workspaceId,
    actorUserId: null,
    action: "bot.created",
    targetType: "bot",
    targetId: bot.id,
    metadata: { name: parsed.data.name, viaApi: true },
  });

  return Response.json({ data: bot }, { status: 201 });
});
