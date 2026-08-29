import { inngest } from "./client";
import { processPendingDeliveries } from "@/lib/webhooks/deliver";
import { sendWeeklyDigestToAllWorkspaces } from "@/lib/notifications/weekly-digest-stats";
import { runWeeklyBackup } from "@/lib/backups/run";
import { createAdminClient } from "@/lib/supabase/admin";
import { htmlToText } from "@/lib/knowledge/html-to-text";
import { ingestKnowledgeSource } from "@/lib/knowledge/ingest";

/**
 * Retries webhook deliveries still in `pending` status. Was manually
 * triggerable only (POST /api/webhooks/process-pending) since Phase
 * 1.13 — this is what actually puts that on a schedule.
 */
export const retryPendingWebhookDeliveries = inngest.createFunction(
  { id: "retry-pending-webhook-deliveries" },
  { cron: "*/15 * * * *" },
  async () => {
    const processed = await processPendingDeliveries();
    return { processed };
  }
);

/** Weekly usage digest — was manually triggerable only since Phase 1.14. */
export const sendWeeklyDigest = inngest.createFunction(
  { id: "send-weekly-digest" },
  { cron: "0 9 * * 1" }, // Monday 9am UTC
  async () => {
    return await sendWeeklyDigestToAllWorkspaces();
  }
);

/** Weekly bots/subscriptions/workspace_members export — was manually
 * triggerable only since Phase 1.19. */
export const scheduledWeeklyBackup = inngest.createFunction(
  { id: "scheduled-weekly-backup" },
  { cron: "0 3 * * 0" }, // Sunday 3am UTC
  async () => {
    return await runWeeklyBackup();
  }
);

/**
 * Re-fetches and re-ingests the concierge bot's help-center source —
 * the actual Phase 1.20 requirement ("re-ingest... on a schedule so it
 * doesn't go stale"). Re-fetching a real URL (rather than re-processing
 * static pasted text, which never changes on its own) is what makes a
 * *scheduled* re-ingestion meaningful at all: if the help center page
 * is updated, the next run picks up the change automatically.
 *
 * No-ops cleanly if CONCIERGE_BOT_ID isn't set (the seed script hasn't
 * been run yet) rather than failing the whole cron — see
 * lib/concierge/seed.ts.
 */
export const reingestConciergeKnowledge = inngest.createFunction(
  { id: "reingest-concierge-knowledge" },
  { cron: "0 4 * * *" }, // daily, 4am UTC
  async () => {
    const botId = process.env.CONCIERGE_BOT_ID;
    if (!botId) {
      return { skipped: true, reason: "CONCIERGE_BOT_ID not configured" };
    }

    const supabase = createAdminClient();
    const { data: sources } = await supabase
      .from("knowledge_sources")
      .select("id, type, title")
      .eq("bot_id", botId)
      .eq("auto_resync", true);

    const results = [];
    for (const source of sources ?? []) {
      // For url-type sources, `title` holds the URL (see addUrlSource
      // in lib/actions/knowledge.ts) — storage_path is only used for
      // uploaded files, and stays null for URL sources.
      if (source.type !== "url" || !source.title) continue;
      try {
        const response = await fetch(source.title, {
          headers: { "User-Agent": "chatbo.ai-concierge-refresh/1.0" },
          signal: AbortSignal.timeout(15_000),
        });
        const html = await response.text();
        const text = htmlToText(html);
        const result = await ingestKnowledgeSource(source.id, botId, text);
        results.push({ sourceId: source.id, ...result });
      } catch (err) {
        results.push({
          sourceId: source.id,
          error: err instanceof Error ? err.message : "Refresh failed",
        });
      }
    }

    return { refreshed: results };
  }
);

export const executeDurableWorkflow = inngest.createFunction(
  { id: "execute-durable-workflow", retries: 3, concurrency: { limit: 20 } },
  { event: "chatbo/workflow.run.requested" },
  async ({ event, step }) => {
    const data = event.data as { workflowId: string; workspaceId: string; runId: string; input: Record<string, unknown>; triggerType: string };
    return await step.run("execute-workflow", async () => {
      const { runWorkflow } = await import("@/lib/workflows/engine");
      return await runWorkflow(data.workflowId, data.workspaceId, data.input, data.triggerType, data.runId, { sleep: (id, ms) => step.sleep(id, `${Math.max(0, ms)}ms`) });
    });
  }
);

export const resumeApprovedWorkflow = inngest.createFunction(
  { id: "resume-approved-workflow", retries: 3, concurrency: { limit: 20 } },
  { event: "chatbo/workflow.approval.resolved" },
  async ({ event, step }) => {
    const data = event.data as { workflowId: string; workspaceId: string; runId: string; approvalId: string; decision: "approved" | "rejected" };
    if (data.decision !== "approved") return { skipped: true, decision: data.decision };
    return await step.run("resume-workflow", async () => {
      const { runWorkflow } = await import("@/lib/workflows/engine");
      return await runWorkflow(data.workflowId, data.workspaceId, {}, "manual", data.runId, { sleep: (id, ms) => step.sleep(id, `${Math.max(0, ms)}ms`) });
    });
  }
);
