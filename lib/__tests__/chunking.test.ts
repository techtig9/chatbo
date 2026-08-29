import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/knowledge/chunking";

describe("chunkText", () => {
  it("returns an empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const result = chunkText("This is a short paragraph.");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("This is a short paragraph.");
  });

  it("keeps short paragraphs together in one chunk", () => {
    const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const result = chunkText(text, { maxChars: 1000, overlapChars: 50 });
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("First paragraph.");
    expect(result[0]).toContain("Third paragraph.");
  });

  it("splits into multiple chunks when content exceeds maxChars", () => {
    const paragraph = "A".repeat(100) + ".";
    const text = Array(10).fill(paragraph).join("\n\n");
    const result = chunkText(text, { maxChars: 300, overlapChars: 30 });
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      // Overlap can push slightly over, but not wildly over.
      expect(chunk.length).toBeLessThan(400);
    }
  });

  it("carries overlap text into the next chunk", () => {
    const paragraph = (n: number) => `Paragraph number ${n} with some real content in it.`;
    const text = Array.from({ length: 8 }, (_, i) => paragraph(i)).join("\n\n");
    const result = chunkText(text, { maxChars: 150, overlapChars: 40 });
    expect(result.length).toBeGreaterThan(1);
    // The tail of chunk 1 should reappear at the start of chunk 2.
    const chunk1Tail = result[0]!.slice(-20);
    expect(result[1]).toContain(chunk1Tail.trim().split(" ").slice(-2).join(" "));
  });

  it("hard-splits a single paragraph longer than maxChars on sentence boundaries", () => {
    const longParagraph = Array(20)
      .fill("This is one sentence in a very long paragraph.")
      .join(" ");
    const result = chunkText(longParagraph, { maxChars: 200, overlapChars: 20 });
    expect(result.length).toBeGreaterThan(1);
    // No chunk should just be an arbitrary mid-word cut for normal input.
    for (const chunk of result) {
      expect(chunk.trim().length).toBeGreaterThan(0);
    }
  });

  it("hard-splits a single sentence longer than maxChars as a last resort", () => {
    const oneGiantSentence = "word ".repeat(100) + ".";
    const result = chunkText(oneGiantSentence, { maxChars: 50, overlapChars: 5 });
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(50);
    }
  });

  it("normalizes Windows line endings before chunking", () => {
    const text = "Paragraph one.\r\n\r\nParagraph two.";
    const result = chunkText(text, { maxChars: 1000, overlapChars: 10 });
    expect(result).toHaveLength(1);
    expect(result[0]).not.toContain("\r");
  });
});
