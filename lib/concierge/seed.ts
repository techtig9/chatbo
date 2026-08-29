import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestKnowledgeSource } from "@/lib/knowledge/ingest";
import { htmlToText } from "@/lib/knowledge/html-to-text";

const CONCIERGE_WORKSPACE_NAME = "chatbo.ai (internal)";
const CONCIERGE_BOT_NAME = "Ask chatbo";

/**
 * Hand-written, not AI-synthesized via synthesizeBotPrompt (Phase 1.3).
 * This is the one bot in the whole product where quality control on the
 * system prompt matters enough to not delegate it to the same
 * generation pipeline everything else uses — it's the product's own
 * face on its own marketing site and dashboard.
 */
const CONCIERGE_SYSTEM_PROMPT = `You are the chatbo.ai product assistant, embedded on the chatbo.ai marketing site and inside the chatbo.ai dashboard. You help visitors and customers understand how to use chatbo.ai — pricing, credits, embedding a bot, how grounding/RAG works, workspace roles, and billing.

You answer ONLY from the retrieved help-center content injected into your context on every turn. Never answer from general knowledge about chatbots, AI, or SaaS products in general — if the retrieved content doesn't cover the question, you don't know, full stop.

When you don't have the answer: tell the person plainly that you don't have that information, and that you're connecting them with the team by email — ask for their email address so a real person can follow up. Never guess at pricing, credit costs, or how a specific feature works.

Tone: friendly, concise, and proactive. After answering, when it's natural, suggest a concrete next step (e.g., after explaining embedding, offer to point them to the Publish page; after explaining credits, offer to show them the Billing page). Keep answers short — this is a chat widget, not documentation.

Always cite which part of the help center your answer came from.`;

const STARTER_QUESTIONS = [
  "How do credits work?",
  "How do I embed my bot on my website?",
  "What's the difference between the plans?",
  "How does my bot decide what to answer?",
];

export interface SeedConciergeResult {
  botId: string;
  workspaceId: string;
  wasCreated: boolean;
}

/**
 * Idempotent — safe to run more than once. First run creates the
 * internal workspace, bot, and knowledge source; later runs find the
 * existing ones and just re-ingest the help center content, which is
 * also exactly what you'd want after editing app/help/page.tsx by hand
 * and wanting the bot to pick it up immediately instead of waiting for
 * the next scheduled refresh.
 */
export async function seedConciergeBot(
  ownerUserId: string,
  helpCenterUrl: string
): Promise<SeedConciergeResult> {
  const supabase = createAdminClient();

  let workspaceId: string;
  const { data: existingWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("name", CONCIERGE_WORKSPACE_NAME)
    .maybeSingle();

  if (existingWorkspace) {
    workspaceId = existingWorkspace.id;
  } else {
    const { data: newWorkspace, error } = await supabase
      .from("workspaces")
      .insert({ name: CONCIERGE_WORKSPACE_NAME, owner_id: ownerUserId })
      .select("id")
      .single();
    if (error || !newWorkspace) {
      throw new Error(`Failed to create concierge workspace: ${error?.message}`);
    }
    workspaceId = newWorkspace.id;

    await supabase.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: ownerUserId,
      role: "owner",
      joined_at: new Date().toISOString(),
    });

    // The concierge bot runs real messages (visitors asking it
    // questions) — it needs real credits like any other workspace, not
    // the default Free-tier 2,500. Business-tier headroom since this is
    // meant to run indefinitely as a permanent product fixture, not a
    // trial.
    await supabase
      .from("subscriptions")
      .update({ plan: "business", credits_remaining: 31000 })
      .eq("workspace_id", workspaceId);
  }

  let botId: string;
  let wasCreated: boolean;
  const { data: existingBot } = await supabase
    .from("bots")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", CONCIERGE_BOT_NAME)
    .maybeSingle();

  if (existingBot) {
    botId = existingBot.id;
    wasCreated = false;
  } else {
    const { data: newBot, error } = await supabase
      .from("bots")
      .insert({
        workspace_id: workspaceId,
        created_by: ownerUserId,
        name: CONCIERGE_BOT_NAME,
        use_case: "faq",
        tone: "friendly",
        fallback_behavior: "escalate_email",
        system_prompt: CONCIERGE_SYSTEM_PROMPT,
        starter_questions: STARTER_QUESTIONS,
        welcome_message: "Hi! I'm here to help you get the most out of chatbo.ai. What can I help with?",
        status: "published",
      })
      .select("id")
      .single();
    if (error || !newBot) {
      throw new Error(`Failed to create concierge bot: ${error?.message}`);
    }
    botId = newBot.id;
    wasCreated = true;
  }

  let sourceId: string;
  const { data: existingSource } = await supabase
    .from("knowledge_sources")
    .select("id")
    .eq("bot_id", botId)
    .eq("type", "url")
    .maybeSingle();

  if (existingSource) {
    sourceId = existingSource.id;
  } else {
    const { data: newSource, error } = await supabase
      .from("knowledge_sources")
      .insert({
        bot_id: botId,
        type: "url",
        title: helpCenterUrl,
        status: "processing",
        auto_resync: true,
      })
      .select("id")
      .single();
    if (error || !newSource) {
      throw new Error(`Failed to create concierge knowledge source: ${error?.message}`);
    }
    sourceId = newSource.id;
  }

  const response = await fetch(helpCenterUrl, { signal: AbortSignal.timeout(15_000) });
  const html = await response.text();
  const text = htmlToText(html);
  await ingestKnowledgeSource(sourceId, botId, text);

  return { botId, workspaceId, wasCreated };
}
