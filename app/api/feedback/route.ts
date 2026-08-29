import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
const schema = z.object({ rating: z.number().int().min(1).max(5), category: z.string().max(50).default("general"), message: z.string().min(3).max(4000), page: z.string().max(500).optional() });
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid feedback" }, { status: 400 });
  const { data: membership } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).not("joined_at", "is", null).limit(1).maybeSingle();
  const { error } = await (supabase as any).from("product_feedback").insert({ workspace_id: membership?.workspace_id ?? null, user_id: user.id, ...parsed.data });
  if (error) return Response.json({ error: "Could not save feedback" }, { status: 400 });
  return Response.json({ ok: true });
}
