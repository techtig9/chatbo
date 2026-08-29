import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({ event: z.string().min(1).max(100), path: z.string().max(500).optional(), metadata: z.record(z.unknown()).optional() });
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid event" }, { status: 400 });
  const { data: memberships } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).not("joined_at", "is", null).limit(1);
  const workspaceId = memberships?.[0]?.workspace_id;
  const client = supabase as any;
  await client.from("growth_events").insert({ workspace_id: workspaceId ?? null, user_id: user.id, ...body.data });
  return Response.json({ ok: true });
}
