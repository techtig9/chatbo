import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { error } = await createAdminClient().from("templates").select("id").limit(1);
    if (error) return Response.json({ status: "not_ready", database: "down" }, { status: 503 });
    return Response.json({ status: "ready", database: "ok" });
  } catch { return Response.json({ status: "not_ready", database: "down" }, { status: 503 }); }
}
