import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWebhookSignatureHeader } from "./sign";

const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 5;

/**
 * Attempts one delivery. Always updates the delivery row's status and
 * attempt count regardless of outcome — a delivery that's still
 * `pending` after this means either it hasn't been tried yet or ran out
 * of attempts, never "we forgot to record what happened."
 */
export async function attemptDelivery(deliveryId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: delivery } = await supabase
    .from("webhook_deliveries")
    .select("id, webhook_endpoint_id, event, payload, attempts")
    .eq("id", deliveryId)
    .maybeSingle();

  if (!delivery) return;

  const { data: endpoint } = await supabase
    .from("webhook_endpoints")
    .select("url, secret, status")
    .eq("id", delivery.webhook_endpoint_id)
    .maybeSingle();

  if (!endpoint || endpoint.status !== "active") {
    await supabase
      .from("webhook_deliveries")
      .update({ status: "failed" })
      .eq("id", deliveryId);
    return;
  }

  const payloadString = JSON.stringify(delivery.payload);
  const { header } = buildWebhookSignatureHeader(payloadString, endpoint.secret);
  const nextAttempts = delivery.attempts + 1;

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Chatbo-Signature": header,
        "X-Chatbo-Event": delivery.event,
      },
      body: payloadString,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });

    if (response.ok) {
      await supabase
        .from("webhook_deliveries")
        .update({ status: "delivered", attempts: nextAttempts })
        .eq("id", deliveryId);
      return;
    }

    throw new Error(`Endpoint returned ${response.status}`);
  } catch {
    const exhausted = nextAttempts >= MAX_ATTEMPTS;
    await supabase
      .from("webhook_deliveries")
      .update({ status: exhausted ? "failed" : "pending", attempts: nextAttempts })
      .eq("id", deliveryId);
  }
}

/**
 * Retries every delivery still in `pending` status. Extracted as its
 * own function so both the manually-triggerable HTTP route and the
 * real Inngest scheduled function (lib/inngest/functions.ts) call the
 * exact same logic — one source of truth, not two copies that could
 * drift.
 */
export async function processPendingDeliveries(): Promise<number> {
  const supabase = createAdminClient();
  const { data: pending } = await supabase
    .from("webhook_deliveries")
    .select("id")
    .eq("status", "pending")
    .limit(100);

  const deliveries = pending ?? [];
  await Promise.all(deliveries.map((d) => attemptDelivery(d.id)));
  return deliveries.length;
}
