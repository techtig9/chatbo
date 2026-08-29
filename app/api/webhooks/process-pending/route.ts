import { NextRequest } from "next/server";
import { processPendingDeliveries } from "@/lib/webhooks/deliver";
import { withRequestLogging } from "@/lib/observability/with-logging";

export const dynamic = "force-dynamic";

/**
 * Manually-triggerable fallback for the same logic Inngest's scheduled
 * function (lib/inngest/functions.ts) now runs automatically every 15
 * minutes. Kept as a real, separately-callable route rather than
 * removed — useful for an on-call engineer who wants to force a retry
 * pass without waiting for the next scheduled run.
 */
export const POST = withRequestLogging("webhooks/process-pending", async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.WEBHOOK_SIGNING_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const processed = await processPendingDeliveries();
  return Response.json({ processed });
});
