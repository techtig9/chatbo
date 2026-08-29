import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Meant to be pinged by an external uptime monitor (Better Stack,
 * UptimeRobot, etc. — the spec's "status page" is hosted BY that
 * service, not built in this app; this endpoint is what it pings).
 * Checks real DB connectivity, not just "the process is running" —
 * a Next.js server can be up while Supabase is unreachable, and that
 * distinction is the whole point of a health check.
 */
export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("templates").select("id").limit(1);

    if (error) {
      return Response.json(
        { status: "degraded", checkedAt, detail: "Database query failed" },
        { status: 503 }
      );
    }

    return Response.json({ status: "ok", checkedAt });
  } catch {
    return Response.json(
      { status: "down", checkedAt, detail: "Could not reach the database" },
      { status: 503 }
    );
  }
}
