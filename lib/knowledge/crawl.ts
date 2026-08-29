import "server-only";
import { htmlToText } from "./html-to-text";

const MAX_PAGES = 25;
const TIMEOUT_MS = 12_000;

function normalizeUrl(input: string) {
  const u = new URL(input);
  u.hash = "";
  return u.toString();
}

function sameOrigin(a: URL, b: URL) { return a.origin === b.origin; }

export async function crawlWebsite(startUrl: string, maxPages = MAX_PAGES) {
  const root = new URL(startUrl);
  if (!/^https?:$/.test(root.protocol)) throw new Error("Only HTTP(S) URLs can be crawled.");
  const queue = [normalizeUrl(startUrl)];
  const seen = new Set<string>();
  const pages: Array<{ url: string; title: string; text: string }> = [];

  while (queue.length && pages.length < Math.min(maxPages, MAX_PAGES)) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    try {
      const response = await fetch(current, { headers: { "User-Agent": "chatbo.ai-crawler/1.0" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !type.includes("text/html")) continue;
      const html = await response.text();
      const text = htmlToText(html);
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || current;
      pages.push({ url: current, title, text });
      for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
        try {
          const next = new URL(match[1]!, current);
          if (sameOrigin(root, next) && /^https?:$/.test(next.protocol)) {
            const normalized = normalizeUrl(next.toString());
            if (!seen.has(normalized) && !queue.includes(normalized)) queue.push(normalized);
          }
        } catch { /* ignore malformed links */ }
      }
    } catch { /* one page failing should not abort the crawl */ }
  }
  return pages;
}

export function parseSitemap(xml: string, baseUrl: string) {
  const root = new URL(baseUrl);
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m => m[1]!.trim()).filter(u => { try { return new URL(u).origin === root.origin; } catch { return false; } }).slice(0, MAX_PAGES);
}
