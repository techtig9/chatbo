import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
const schema = z.object({ listingId: z.string().uuid(), action: z.enum(["approve", "reject", "archive", "pass_scan", "fail_scan"]) });
export async function POST(request: Request) {
  const { user } = await getCurrentUserAndWorkspace();
  if (!user?.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid moderation request" }, { status: 400 });
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (parsed.data.action === "approve") { patch.status = "published"; patch.security_scan_status = "passed"; patch.published_at = new Date().toISOString(); }
  if (parsed.data.action === "reject") patch.status = "rejected";
  if (parsed.data.action === "archive") patch.status = "archived";
  if (parsed.data.action === "pass_scan") patch.security_scan_status = "passed";
  if (parsed.data.action === "fail_scan") { patch.security_scan_status = "failed"; patch.status = "rejected"; }
  const { data, error } = await (supabase as any).from("marketplace_listings").update(patch).eq("id", parsed.data.listingId).select("id,status,security_scan_status").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ listing: data });
}
