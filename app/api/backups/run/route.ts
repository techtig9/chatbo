import { NextRequest } from "next/server";
import { runWeeklyBackup } from "@/lib/backups/run";
import { withRequestLogging } from "@/lib/observability/with-logging";

export const dynamic = "force-dynamic";

/**
 * Manually-triggerable fallback for the same logic Inngest's scheduled
 * function (lib/inngest/functions.ts) now runs automatically every
 * Sunday. Kept as a real, separately-callable route — useful for
 * forcing a backup before a risky migration without waiting for the
 * next scheduled run.
 */
export const POST = withRequestLogging("backups/run", async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.WEBHOOK_SIGNING_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  try {
    const result = await runWeeklyBackup();
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backup failed";
    return Response.json({ error: message }, { status: 500 });
  }
});
