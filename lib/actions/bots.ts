"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { requireWorkspaceAction, WorkspaceAuthorizationError } from "@/lib/authz/rbac";
import { canCreateBot, canAffordAction, upgradeMessage } from "@/lib/billing/credits";
import { spendCreditsAtomic } from "@/lib/billing/spend";
import { createBotSchema, updateBotSchema } from "@/lib/validation/bots";
import { synthesizeBotPrompt } from "@/lib/ai/synthesize-bot";
import { logAuditEvent } from "@/lib/audit/log";
import { toUserMessage } from "@/lib/errors/user-facing";

export async function createBot(formData: FormData): Promise<{ success: boolean; error?: string; botId?: string; welcomeMessage?: string; starterQuestions?: string[] }> {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return { success: false, error: "Not signed in." };

  const parsed = createBotSchema.safeParse({
    name: formData.get("name"),
    useCase: formData.get("useCase"),
    tone: formData.get("tone"),
    fallbackBehavior: formData.get("fallbackBehavior"),
    businessContext: formData.get("businessContext") || undefined,
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    requireWorkspaceAction(workspace.role, "bot:create");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      return { success: false, error: "Your role doesn't allow creating bots. Ask a workspace admin." };
    }
    throw err;
  }

  const supabase = createClient();

  const { count: currentBotCount } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.workspaceId);

  if (!canCreateBot(currentBotCount ?? 0, workspace.plan)) {
    return { success: false, error: upgradeMessage("bots") };
  }

  // synthesizeBotPrompt below is a real AI gateway call (CREATE_BOT ->
  // Groq/Cerebras/OpenRouter/Claude) — CREDIT_COSTS.promptRegeneration
  // exists specifically for it, but nothing was ever checking or
  // deducting it, so bot creation was free, unmetered AI usage.
  if (!canAffordAction(workspace.creditsRemaining, "promptRegeneration", user.isPlatformAdmin)) {
    return { success: false, error: upgradeMessage("credits") };
  }

  // Real Claude API call — this is the one part of Phase 1.3 this sandbox
  // can't verify end-to-end without a live ANTHROPIC_API_KEY.
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
    console.error("[bots] AI synthesis failed during createBot", err);
    return { success: false, error: toUserMessage(err, "generate your agent") };
  }
  // Only charge for a successful generation — matches the existing
  // knowledge-ingestion convention (failed documents aren't charged either).
  if (!user.isPlatformAdmin) await spendCreditsAtomic(workspace.workspaceId, "promptRegeneration");

  const { data: bot, error: insertError } = await supabase
    .from("bots")
    .insert({
      workspace_id: workspace.workspaceId,
      created_by: user.id,
      name: parsed.data.name,
      // The brief the user typed is the closest thing to a description
      // this form collects — previously nothing populated this column at
      // all, so every agent card (Phase 8's Agents page) fell back to a
      // generic "{use case} agent" line instead of anything specific.
      description: parsed.data.businessContext?.slice(0, 200) ?? null,
      use_case: parsed.data.useCase,
      tone: parsed.data.tone,
      fallback_behavior: parsed.data.fallbackBehavior,
      system_prompt: synthesis.systemPrompt,
      starter_questions: synthesis.starterQuestions,
      welcome_message: synthesis.welcomeMessage,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !bot) {
    return { success: false, error: "Bot was generated but couldn't be saved. Try again." };
  }

  revalidatePath("/dashboard/bots");
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user.id,
    action: "bot.created",
    targetType: "bot",
    targetId: bot.id,
    metadata: { name: parsed.data.name, useCase: parsed.data.useCase },
  });
  return { success: true, botId: bot.id, welcomeMessage: synthesis.welcomeMessage, starterQuestions: synthesis.starterQuestions };
}

// NOTE: redirect() throws to abort execution — every logAuditEvent call
// in this file is placed BEFORE its corresponding redirect for exactly
// that reason, not after. Verified by the "unreachable code" ESLint
// pass and confirmed by re-reading each function below.

export async function updateBot(botId: string, formData: FormData) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  try {
    requireWorkspaceAction(workspace.role, "bot:edit");
  } catch {
    redirect(`/dashboard/bots/${botId}/edit?error=${encodeURIComponent("Your role doesn't allow editing bots.")}`);
  }

  const starterQuestionsRaw = formData.get("starterQuestions");
  const starterQuestions =
    typeof starterQuestionsRaw === "string" && starterQuestionsRaw.length > 0
      ? starterQuestionsRaw.split("\n").map((q) => q.trim()).filter(Boolean)
      : [];

  const parsed = updateBotSchema.safeParse({
    name: formData.get("name"),
    systemPrompt: formData.get("systemPrompt"),
    welcomeMessage: formData.get("welcomeMessage"),
    tone: formData.get("tone"),
    fallbackBehavior: formData.get("fallbackBehavior"),
    brandColor: formData.get("brandColor") || "",
    widgetPosition: formData.get("widgetPosition"),
    starterQuestions,
    agentConfig: formData.get("agentConfig") || undefined,
  });

  if (!parsed.success) {
    redirect(
      `/dashboard/bots/${botId}/edit?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid input"
      )}`
    );
  }

  let agentConfig: Record<string, unknown> = {};
  if (parsed.data.agentConfig) {
    try {
      const parsedConfig = JSON.parse(parsed.data.agentConfig);
      if (parsedConfig && typeof parsedConfig === "object" && !Array.isArray(parsedConfig)) {
        agentConfig = parsedConfig as Record<string, unknown>;
      }
    } catch {
      redirect(`/dashboard/bots/${botId}/edit?error=${encodeURIComponent("Agent configuration is invalid. Please try again.")}`);
    }
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("bots")
    .update({
      name: parsed.data.name,
      system_prompt: parsed.data.systemPrompt,
      welcome_message: parsed.data.welcomeMessage,
      tone: parsed.data.tone,
      fallback_behavior: parsed.data.fallbackBehavior,
      brand_color: parsed.data.brandColor || null,
      widget_position: parsed.data.widgetPosition,
      starter_questions: parsed.data.starterQuestions,
      agent_config: agentConfig,
    })
    .eq("id", botId)
    .eq("workspace_id", workspace.workspaceId); // belt-and-suspenders alongside RLS

  if (error) {
    redirect(
      `/dashboard/bots/${botId}/edit?error=${encodeURIComponent("Couldn't save changes. Try again.")}`
    );
  }

  revalidatePath(`/dashboard/bots/${botId}/edit`);
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user?.id ?? null,
    action: "bot.updated",
    targetType: "bot",
    targetId: botId,
  });
  redirect(`/dashboard/bots/${botId}/edit?success=Saved`);
}

export async function setBotPublishStatus(
  botId: string,
  publish: boolean
): Promise<{ success: boolean; error?: string }> {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) {
    return { success: false, error: "Not signed in." };
  }

  try {
    requireWorkspaceAction(workspace.role, "bot:publish");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      return { success: false, error: "Your role doesn't allow publishing bots." };
    }
    throw err;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("bots")
    .update({ status: publish ? "published" : "draft" })
    .eq("id", botId)
    .eq("workspace_id", workspace.workspaceId);

  if (error) {
    return { success: false, error: "Couldn't update publish status." };
  }

  revalidatePath(`/dashboard/bots/${botId}/edit`);
  revalidatePath("/dashboard/bots");
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user?.id ?? null,
    action: publish ? "bot.published" : "bot.unpublished",
    targetType: "bot",
    targetId: botId,
  });
  return { success: true };
}

export async function deleteBot(botId: string) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");

  try {
    requireWorkspaceAction(workspace.role, "bot:delete");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      redirect(
        `/dashboard/bots?error=${encodeURIComponent("Your role doesn't allow deleting bots.")}`
      );
    }
    throw err;
  }

  const supabase = createClient();
  // knowledge_sources, knowledge_chunks, conversations, messages, shares,
  // and integrations all cascade from bots via their own FK constraints
  // (0001_init.sql) — one delete here is enough.
  const { data: deletedBot, error } = await supabase
    .from("bots")
    .delete()
    .eq("id", botId)
    .eq("workspace_id", workspace.workspaceId)
    .select("name")
    .maybeSingle();

  if (error) {
    redirect(`/dashboard/bots?error=${encodeURIComponent("Couldn't delete that bot.")}`);
  }

  revalidatePath("/dashboard/bots");
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user?.id ?? null,
    action: "bot.deleted",
    targetType: "bot",
    targetId: botId,
    metadata: { name: deletedBot?.name },
  });
  redirect("/dashboard/bots?success=Bot+deleted");
}

export async function setBotArchived(
  botId: string,
  archived: boolean
): Promise<{ success: boolean; error?: string }> {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) return { success: false, error: "Not signed in." };

  try {
    // Same sensitivity tier as publish/unpublish — both are reversible
    // visibility changes, not a destructive action like delete.
    requireWorkspaceAction(workspace.role, "bot:publish");
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      return { success: false, error: "Your role doesn't allow archiving bots." };
    }
    throw err;
  }

  const supabase = createClient();
  // Unarchiving returns a bot to draft, not back to published — an
  // archived agent shouldn't silently start serving live traffic again
  // the moment someone un-archives it; publishing is a separate,
  // deliberate step.
  const { error } = await supabase
    .from("bots")
    .update({ status: archived ? "archived" : "draft" })
    .eq("id", botId)
    .eq("workspace_id", workspace.workspaceId);

  if (error) return { success: false, error: "Couldn't update that bot." };

  revalidatePath("/dashboard/bots");
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user?.id ?? null,
    action: archived ? "bot.archived" : "bot.unarchived",
    targetType: "bot",
    targetId: botId,
  });
  return { success: true };
}

export async function duplicateBot(botId: string): Promise<{ success: boolean; error?: string; newBotId?: string }> {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace || !user) return { success: false, error: "Not signed in." };

  const { data: bots } = await createClient().from("bots").select("id").eq("workspace_id", workspace.workspaceId);
  if (!canCreateBot((bots ?? []).length, workspace.plan)) {
    return { success: false, error: upgradeMessage("bots") };
  }

  const supabase = createClient();
  const { data: source, error: fetchError } = await supabase
    .from("bots")
    .select("name, description, use_case, tone, fallback_behavior, system_prompt, model, avatar, brand_color, welcome_message, widget_position, allowed_domains")
    .eq("id", botId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();
  if (fetchError || !source) return { success: false, error: "Couldn't find that agent." };

  const { data: copy, error: insertError } = await supabase
    .from("bots")
    .insert({ ...source, name: `${source.name} (copy)`, workspace_id: workspace.workspaceId, created_by: user.id, status: "draft" })
    .select("id")
    .single();
  if (insertError || !copy) return { success: false, error: "Couldn't duplicate that agent." };

  // Knowledge sources are deliberately NOT copied — they can be large
  // (raw_text/storage_path) and re-ingesting the same content twice
  // would double-count against the workspace's knowledge-doc plan limit
  // for no benefit; the duplicate starts with the same prompt/config and
  // an empty knowledge base, which the user can point at the same
  // sources deliberately if they want that.
  revalidatePath("/dashboard/bots");
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user.id,
    action: "bot.duplicated",
    targetType: "bot",
    targetId: copy.id,
    metadata: { sourceBotId: botId },
  });
  return { success: true, newBotId: copy.id };
}
