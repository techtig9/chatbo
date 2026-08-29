import { describe, it, expect } from "vitest";
import { hashChunkContent } from "@/lib/knowledge/hash";
import { htmlToText } from "@/lib/knowledge/html-to-text";

describe("hashChunkContent", () => {
  it("produces the same hash for identical content", () => {
    expect(hashChunkContent("Hello world")).toBe(hashChunkContent("Hello world"));
  });

  it("produces different hashes for different content", () => {
    expect(hashChunkContent("Hello world")).not.toBe(hashChunkContent("Goodbye world"));
  });

  it("is insensitive to leading/trailing whitespace and internal spacing differences", () => {
    expect(hashChunkContent("  Hello   world  ")).toBe(hashChunkContent("Hello world"));
  });

  it("is insensitive to newline-vs-space differences after normalization", () => {
    expect(hashChunkContent("Hello\nworld")).toBe(hashChunkContent("Hello world"));
  });

  it("returns a 64-character hex string (sha256)", () => {
    const hash = hashChunkContent("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("htmlToText", () => {
  it("strips basic tags", () => {
    const result = htmlToText("<p>Hello <b>world</b></p>");
    expect(result).toBe("Hello world");
  });

  it("removes script and style content entirely, not just the tags", () => {
    const result = htmlToText(
      "<p>Visible</p><script>alert('hidden')</script><style>.a{color:red}</style>"
    );
    expect(result).not.toContain("alert");
    expect(result).not.toContain("color:red");
    expect(result).toContain("Visible");
  });

  it("converts block elements into paragraph breaks", () => {
    const result = htmlToText("<div>First</div><div>Second</div>");
    expect(result).toBe("First\n\nSecond");
  });

  it("decodes common HTML entities", () => {
    const result = htmlToText("<p>Fish &amp; Chips &mdash; &quot;the best&quot;</p>");
    expect(result).toBe('Fish & Chips — "the best"');
  });

  it("collapses excess whitespace", () => {
    const result = htmlToText("<p>Too    many     spaces</p>");
    expect(result).toBe("Too many spaces");
  });

  it("handles a realistic small page", () => {
    const html = `
      <html><body>
        <nav>Home | About</nav>
        <h1>Welcome</h1>
        <p>We sell handmade candles.</p>
        <script>trackPageView();</script>
      </body></html>
    `;
    const result = htmlToText(html);
    expect(result).toContain("Welcome");
    expect(result).toContain("We sell handmade candles.");
    expect(result).not.toContain("trackPageView");
  });
});
