import { NextResponse } from "next/server";
import { crawlWebsite, parseSitemap } from "@/lib/knowledge/crawl";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.url || typeof body.url !== "string") return NextResponse.json({ error: "url is required" }, { status: 400 });
    if (body.mode === "sitemap") {
      const response = await fetch(body.url, { headers: { "User-Agent": "chatbo.ai-crawler/1.0" }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) return NextResponse.json({ error: `Sitemap returned ${response.status}` }, { status: 400 });
      return NextResponse.json({ urls: parseSitemap(await response.text(), body.url) });
    }
    const pages = await crawlWebsite(body.url, Number(body.maxPages) || 25);
    return NextResponse.json({ pages });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Crawl failed" }, { status: 500 });
  }
}
