import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
const schema = z.object({ email: z.string().email(), code: z.string().min(4).max(80) });
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid referral" }, { status: 400 });
  const { data: membership } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).not("joined_at", "is", null).limit(1).maybeSingle();
  if (!membership) return Response.json({ error: "Workspace not found" }, { status: 400 });
  const client = supabase as any;
  const { data, error } = await client.from("referrals").insert({ referrer_workspace_id: membership.workspace_id, referred_email: parsed.data.email, code: parsed.data.code }).select("id,status").single();
  if (error) return Response.json({ error: "Could not create referral" }, { status: 400 });
  return Response.json({ referral: data });
}
