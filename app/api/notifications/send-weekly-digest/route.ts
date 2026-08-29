import { NextRequest } from "next/server";
import { sendWeeklyDigestToAllWorkspaces } from "@/lib/notifications/weekly-digest-stats";
import { withRequestLogging } from "@/lib/observability/with-logging";

export const dynamic = "force-dynamic";

/**
 * Manually-triggerable fallback for the same logic Inngest's scheduled
 * function now runs automatically every Monday.
 */
export const POST = withRequestLogging(
  "notifications/send-weekly-digest",
  async (request: NextRequest) => {
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.WEBHOOK_SIGNING_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return Response.json({ error: "Not authorized" }, { status: 401 });
    }

    const result = await sendWeeklyDigestToAllWorkspaces();
    return Response.json(result);
  }
);
