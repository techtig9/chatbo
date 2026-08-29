import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";

const schema = z.object({ listingId: z.string().uuid(), rating: z.number().int().min(1).max(5), title: z.string().max(120).default(""), body: z.string().max(2000).default("") });

export async function POST(request: Request) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  const supabase = createClient();
  const { data: install } = await (supabase as any).from("marketplace_installs").select("id").eq("listing_id", parsed.data.listingId).eq("target_workspace_id", workspace.workspaceId).eq("status", "installed").maybeSingle();
  if (!install) return NextResponse.json({ error: "Install the agent before reviewing it" }, { status: 403 });
  const { data: review, error } = await (supabase as any).from("marketplace_reviews").upsert({ ...parsed.data, workspace_id: workspace.workspaceId, user_id: user.id }, { onConflict: "listing_id,user_id" }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: reviews } = await (supabase as any).from("marketplace_reviews").select("rating").eq("listing_id", parsed.data.listingId).eq("status", "published");
  const count = reviews?.length ?? 0;
  const average = count ? reviews.reduce((sum: number, row: any) => sum + row.rating, 0) / count : 0;
  await (supabase as any).from("marketplace_listings").update({ rating_count: count, rating_average: Number(average.toFixed(2)) }).eq("id", parsed.data.listingId);
  return NextResponse.json({ review });
}
