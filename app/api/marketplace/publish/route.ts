import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { publishAgent } from "@/lib/marketplace/service";

const schema = z.object({
  botId: z.string().uuid(), title: z.string().min(1).max(120), description: z.string().max(2000).default(""),
  category: z.string().min(1).max(40), tags: z.array(z.string().max(30)).max(20).default([]),
  visibility: z.enum(["private", "unlisted", "public"]).default("private"), pricingType: z.enum(["free", "paid"]).default("free"),
  priceCents: z.number().int().min(0).max(1000000).default(0), license: z.enum(["standard", "commercial", "custom"]).default("standard"),
});

export async function POST(request: Request) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid marketplace payload", details: parsed.error.flatten() }, { status: 400 });
  try {
    const listing = await publishAgent({ ...parsed.data, workspaceId: workspace.workspaceId });
    return NextResponse.json({ listing });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to publish agent" }, { status: 400 });
  }
}
