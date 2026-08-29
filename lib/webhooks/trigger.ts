import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { attemptDelivery } from "./deliver";

export type WebhookEventType = "conversation.started" | "message.created" | "feedback.submitted";

/**
 * Called from the chat/feedback hot paths whenever a qualifying event
 * happens. Finds every active endpoint subscribed to this event type,
 * writes a `webhook_deliveries` row for each, and attempts delivery
 * immediately.
 *
 * Honest limitation: this attempts delivery inline rather than through
 * a real durable queue (Inngest, per the original spec) — retries for a
 * delivery that fails here rely on something else calling
 * processPendingDeliveries later (see app/api/webhooks/process-pending),
 * which nothing currently triggers automatically. Wiring that up is
 * Phase 1.20 territory.
 *
 * Callers should AWAIT this despite the latency cost — this codebase
 * has no `waitUntil()`-style background task API wired up (that needs
 * a specific hosting integration), so a fire-and-forget call here could
 * get its serverless function frozen mid-delivery before the HTTP POST
 * even completes. Awaiting is the safe choice until real background
 * task support exists.
 */
export async function triggerWebhookEvent(
  workspaceId: string,
  event: WebhookEventType,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();

  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id, events")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  const matching = (endpoints ?? []).filter((e) => (e.events as string[]).includes(event));
  if (matching.length === 0) return;

  const fullPayload = { event, timestamp: new Date().toISOString(), data: payload };

  await Promise.all(
    matching.map(async (endpoint) => {
      const { data: delivery } = await supabase
        .from("webhook_deliveries")
        .insert({ webhook_endpoint_id: endpoint.id, event, payload: fullPayload })
        .select("id")
        .single();

      if (delivery) {
        await attemptDelivery(delivery.id);
      }
    })
  );
}
