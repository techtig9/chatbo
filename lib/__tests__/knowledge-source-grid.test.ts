import { describe, expect, it } from "vitest";
import { filterKnowledgeSources, displayType, sizeLabel, type KnowledgeSourceCardData } from "@/components/knowledge/knowledge-source-grid";

function source(overrides: Partial<KnowledgeSourceCardData>): KnowledgeSourceCardData {
  return {
    id: "1",
    title: "Return Policy",
    type: "text",
    mimeType: null,
    fileSize: null,
    rawTextLength: 500,
    status: "ready",
    chunkCount: 3,
    lastIndexedAt: new Date().toISOString(),
    errorMessage: null,
    ...overrides,
  };
}

describe("filterKnowledgeSources", () => {
  const sources = [
    source({ id: "1", title: "Return Policy" }),
    source({ id: "2", title: "Shipping FAQ" }),
    source({ id: "3", title: "acme.com/pricing" }),
  ];

  it("returns everything when the query is empty", () => {
    expect(filterKnowledgeSources(sources, "")).toHaveLength(3);
  });

  it("matches by title, case-insensitively", () => {
    expect(filterKnowledgeSources(sources, "shipping").map((s) => s.id)).toEqual(["2"]);
    expect(filterKnowledgeSources(sources, "SHIPPING").map((s) => s.id)).toEqual(["2"]);
  });

  it("matches a partial substring", () => {
    expect(filterKnowledgeSources(sources, "pricing").map((s) => s.id)).toEqual(["3"]);
  });

  it("returns nothing for a query that matches no title", () => {
    expect(filterKnowledgeSources(sources, "nonexistent")).toEqual([]);
  });
});

describe("displayType", () => {
  it("labels url and website sources by their DB type", () => {
    expect(displayType(source({ type: "url" })).label).toBe("URL");
    expect(displayType(source({ type: "website" })).label).toBe("Website");
    expect(displayType(source({ type: "text" })).label).toBe("Text");
  });

  it("refines a 'file' source using its extension, without claiming PDF/DOC support", () => {
    expect(displayType(source({ type: "file", title: "policy.csv" })).label).toBe("CSV");
    expect(displayType(source({ type: "file", title: "notes.json" })).label).toBe("JSON");
    expect(displayType(source({ type: "file", title: "page.html" })).label).toBe("HTML");
    expect(displayType(source({ type: "file", title: "readme.txt" })).label).toBe("Text file");
  });

  it("falls back to mime type when the extension is ambiguous", () => {
    expect(displayType(source({ type: "file", title: "export", mimeType: "text/csv" })).label).toBe("CSV");
  });
});

describe("sizeLabel", () => {
  it("formats file sizes in bytes, KB, or MB", () => {
    expect(sizeLabel(source({ fileSize: 500 }))).toBe("500 B");
    expect(sizeLabel(source({ fileSize: 2048 }))).toBe("2.0 KB");
    expect(sizeLabel(source({ fileSize: 5 * 1024 * 1024 }))).toBe("5.0 MB");
  });

  it("falls back to a character count when there is no file size", () => {
    expect(sizeLabel(source({ fileSize: null, rawTextLength: 1234 }))).toBe("1,234 chars");
  });

  it("shows a dash when neither is known", () => {
    expect(sizeLabel(source({ fileSize: null, rawTextLength: null }))).toBe("—");
  });
});
