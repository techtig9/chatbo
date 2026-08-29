import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaddleSignature } from "@/lib/billing/paddle-webhook";
import { planForPriceId } from "@/lib/billing/paddle-plans";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import { getWorkspaceOwner } from "@/lib/notifications/workspace-owner";
import { createNotification } from "@/lib/notifications/create";
import { sendEmail } from "@/lib/email/resend";
import { paymentFailedEmail, subscriptionCanceledEmail } from "@/lib/email/templates";
import { z } from "zod";

export const runtime = "nodejs";

const paddleWebhookEventSchema = z.object({
  event_id: z.string(),
  event_type: z.string(),
  data: z.object({
    id: z.string(),
    customer_id: z.string().optional(),
    subscription_id: z.string().optional(),
    status: z.string().optional(),
    next_billed_at: z.string().nullable().optional(),
    items: z.array(z.object({ price: z.object({ id: z.string().optional() }).optional() })).optional(),
    custom_data: z.object({ workspaceId: z.string().optional() }).nullable().optional(),
    details: z.object({ totals: z.object({ total: z.string().optional() }).optional() }).optional(),
  }),
});

type PaddleWebhookEvent = z.infer<typeof paddleWebhookEventSchema>;

export async function POST(request: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed — an unconfigured secret must never be treated as
    // "no verification needed."
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("paddle-signature");

  if (!verifyPaddleSignature(rawBody, signatureHeader, secret)) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: PaddleWebhookEvent;
  try {
    const rawJson = JSON.parse(rawBody);
    const validated = paddleWebhookEventSchema.safeParse(rawJson);
    if (!validated.success) {
      console.error("Paddle webhook payload failed validation:", validated.error.issues);
      return Response.json({ error: "Malformed payload" }, { status: 400 });
    }
    event = validated.data;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const workspaceId = event.data.custom_data?.workspaceId;

  // Idempotency: Paddle delivers webhooks at-least-once (it retries on any
  // non-2xx response or timeout), so the same event_id can arrive more than
  // once. Record it before doing any work; if the insert conflicts, this
  // exact event was already fully processed — skip re-applying it (this is
  // what stops a redelivered subscription.updated from resetting credits
  // a second time).
  const { error: dedupeError } = await supabase
    .from("paddle_webhook_events")
    .insert({ event_id: event.event_id, event_type: event.event_type, workspace_id: workspaceId ?? null });
  if (dedupeError) {
    if (dedupeError.code === "23505") {
      return Response.json({ received: true, duplicate: true });
    }
    // Don't block processing on a logging failure — better to risk a rare
    // double-apply than to silently drop a legitimate billing event.
    console.error(`Failed to record Paddle webhook event ${event.event_id}:`, dedupeError.message);
  }

  switch (event.event_type) {
    case "subscription.created":
    case "subscription.updated": {
      if (!workspaceId) {
        // Nothing we can attribute this to — log and acknowledge rather
        // than retry forever on an event we can never resolve.
        console.error(`Paddle event ${event.event_id} missing custom_data.workspaceId`);
        break;
      }

      const priceId = event.data.items?.[0]?.price?.id;
      const plan = priceId ? planForPriceId(priceId) : null;

      if (!plan) {
        console.error(`Paddle event ${event.event_id}: unrecognized price ID ${priceId}`);
        break;
      }

      await supabase
        .from("subscriptions")
        .update({
          plan,
          status: event.data.status ?? "active",
          paddle_subscription_id: event.data.id,
          paddle_customer_id: event.data.customer_id ?? null,
          renews_at: event.data.next_billed_at ?? null,
        })
        .eq("workspace_id", workspaceId);

      // A plan change resets credits to the new plan's full monthly
      // allotment rather than carrying over a stale balance — matches
      // "monthly credits" as advertised, not a bank that accumulates.
      await supabase.rpc("reset_monthly_credits", {
        p_workspace_id: workspaceId,
        p_plan_credits: PLAN_LIMITS[plan].monthlyCredits,
      });
      break;
    }

    case "subscription.canceled": {
      if (!workspaceId) break;
      // Deliberately NOT downgrading the plan or credits here — Paddle
      // cancellations take effect at the end of the current billing
      // period, and a scheduled job (Phase 1.13/1.20's Inngest queue)
      // is the right place to check `renews_at` and actually downgrade
      // once it's passed. This just records that cancellation happened.
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("workspace_id", workspaceId);

      const owner = await getWorkspaceOwner(workspaceId);
      if (owner) {
        const email = subscriptionCanceledEmail({ workspaceName: owner.workspaceName, accessUntil: event.data.next_billed_at ?? null });
        await sendEmail({ to: owner.email, subject: email.subject, html: email.html });
      }
      break;
    }

    case "transaction.completed": {
      if (!workspaceId) break;
      const { error } = await supabase.from("payments").insert({
        workspace_id: workspaceId,
        paddle_transaction_id: event.data.id,
        amount: event.data.details?.totals?.total
          ? Number(event.data.details.totals.total) / 100 // Paddle amounts are in the smallest currency unit
          : null,
        status: event.data.status ?? "completed",
      });

      // A unique-constraint violation here means Paddle retried a
      // delivery we already processed — that's success, not an error,
      // so don't return a failure status that would make Paddle keep
      // retrying forever.
      if (error && error.code !== "23505") {
        console.error(`Failed to log payment for event ${event.event_id}:`, error.message);
      }
      break;
    }

    case "transaction.payment_failed": {
      if (!workspaceId) break;
      const owner = await getWorkspaceOwner(workspaceId);
      if (owner) {
        await createNotification({
          userId: owner.userId,
          type: "payment_failed",
          title: "Your payment couldn't be processed",
          body: "Update your payment method to avoid interruption.",
        });
        const email = paymentFailedEmail({ workspaceName: owner.workspaceName });
        await sendEmail({ to: owner.email, subject: email.subject, html: email.html });
      }
      break;
    }

    default:
      // Unhandled event types are acknowledged, not errors — Paddle
      // sends many event types this build doesn't need to act on.
      break;
  }

  return Response.json({ received: true });
}
