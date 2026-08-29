import { describe, expect, it } from "vitest";
import { parseSitemap } from "@/lib/knowledge/crawl";

describe("knowledge crawler utilities", () => {
  it("extracts same-origin sitemap URLs", () => {
    const xml = `<urlset><url><loc>https://example.com/a</loc></url><url><loc>https://other.com/b</loc></url></urlset>`;
    expect(parseSitemap(xml, "https://example.com/sitemap.xml")).toEqual(["https://example.com/a"]);
  });
});
