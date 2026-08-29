import { describe, it, expect } from "vitest";
import {
  filterRelevantChunks,
  shouldTriggerFallback,
  formatChunksForContext,
  SIMILARITY_THRESHOLD,
  MAX_RETRIEVED_CHUNKS,
  type RetrievedChunk,
} from "@/lib/knowledge/retrieval-logic";

function chunk(similarity: number, id = "c1"): RetrievedChunk {
  return {
    id,
    content: `Content for ${id}`,
    sourceId: "s1",
    sourceTitle: "Refund Policy.pdf",
    similarity,
  };
}

describe("filterRelevantChunks", () => {
  it("keeps chunks at or above the threshold", () => {
    const result = filterRelevantChunks([chunk(0.9), chunk(0.5)]);
    expect(result).toHaveLength(2);
  });

  it("drops chunks below the threshold", () => {
    const result = filterRelevantChunks([chunk(0.9), chunk(0.49)]);
    expect(result).toHaveLength(1);
    expect(result[0]!.similarity).toBe(0.9);
  });

  it("respects a custom threshold override", () => {
    const result = filterRelevantChunks([chunk(0.6)], 0.7);
    expect(result).toHaveLength(0);
  });

  it("sorts results by descending similarity", () => {
    const result = filterRelevantChunks([chunk(0.6, "a"), chunk(0.95, "b"), chunk(0.7, "c")]);
    expect(result.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("caps results at MAX_RETRIEVED_CHUNKS even if more candidates pass the threshold", () => {
    const many = Array.from({ length: 10 }, (_, i) => chunk(0.9, `c${i}`));
    const result = filterRelevantChunks(many);
    expect(result).toHaveLength(MAX_RETRIEVED_CHUNKS);
  });

  it("returns an empty array when nothing meets the bar", () => {
    expect(filterRelevantChunks([chunk(0.1), chunk(0.2)])).toEqual([]);
  });
});

describe("shouldTriggerFallback — the groundedness gate", () => {
  it("triggers fallback when no chunks survived filtering", () => {
    expect(shouldTriggerFallback([])).toBe(true);
  });

  it("does not trigger fallback when at least one relevant chunk exists", () => {
    expect(shouldTriggerFallback([chunk(0.8)])).toBe(false);
  });

  it("end-to-end: an out-of-scope question (all low similarity) triggers fallback", () => {
    const candidates = [chunk(0.3, "a"), chunk(0.25, "b"), chunk(0.1, "c")];
    const relevant = filterRelevantChunks(candidates);
    expect(shouldTriggerFallback(relevant)).toBe(true);
  });

  it("end-to-end: an answerable question (high similarity) does not trigger fallback", () => {
    const candidates = [chunk(0.87, "a"), chunk(0.3, "b")];
    const relevant = filterRelevantChunks(candidates);
    expect(shouldTriggerFallback(relevant)).toBe(false);
    expect(relevant).toHaveLength(1);
  });

  it("boundary: a chunk exactly at SIMILARITY_THRESHOLD counts as relevant", () => {
    const relevant = filterRelevantChunks([chunk(SIMILARITY_THRESHOLD)]);
    expect(shouldTriggerFallback(relevant)).toBe(false);
  });
});

describe("formatChunksForContext", () => {
  it("returns an empty string for no chunks", () => {
    expect(formatChunksForContext([])).toBe("");
  });

  it("labels each chunk with its source title", () => {
    const result = formatChunksForContext([chunk(0.9, "a")]);
    expect(result).toContain("Refund Policy.pdf");
    expect(result).toContain("Content for a");
  });

  it("numbers multiple sources in order", () => {
    const result = formatChunksForContext([chunk(0.9, "a"), chunk(0.8, "b")]);
    expect(result).toContain("[Source 1:");
    expect(result).toContain("[Source 2:");
  });
});
