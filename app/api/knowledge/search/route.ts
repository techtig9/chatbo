import { NextResponse } from "next/server";
import { hybridRetrieveForQuery } from "@/lib/knowledge/hybrid-retrieve";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.botId || typeof body.query !== "string" || body.query.trim().length < 2) return NextResponse.json({ error: "botId and query are required" }, { status: 400 });
    const result = await hybridRetrieveForQuery(body.botId, body.query.trim(), { metadataFilter: body.metadataFilter });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Knowledge search failed" }, { status: 500 });
  }
}
