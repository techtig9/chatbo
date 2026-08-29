import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
const schema = z.object({ listingId: z.string().uuid(), reason: z.string().min(3).max(80), details: z.string().max(2000).default("") });
export async function POST(request: Request) {
  const { user } = await getCurrentUserAndWorkspace();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  const supabase = createClient();
  const { error } = await (supabase as any).from("marketplace_reports").insert({ ...parsed.data, reporter_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
