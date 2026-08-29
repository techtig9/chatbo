import { describe, it, expect } from "vitest";
import { messagesToCsv, messagesToJson, type ExportableMessage } from "@/lib/analytics/export";

const sample: ExportableMessage[] = [
  { role: "user", content: "Do you ship internationally?", createdAt: "2026-01-01T00:00:00Z", feedback: null },
  { role: "assistant", content: "Yes, we ship worldwide.", createdAt: "2026-01-01T00:00:05Z", feedback: "up" },
];

describe("messagesToCsv", () => {
  it("includes a header row", () => {
    const csv = messagesToCsv(sample);
    expect(csv.split("\n")[0]).toBe("timestamp,role,content,feedback");
  });

  it("includes one row per message", () => {
    const csv = messagesToCsv(sample);
    expect(csv.split("\n")).toHaveLength(3); // header + 2 rows
  });

  it("quotes fields containing commas", () => {
    const withComma: ExportableMessage[] = [
      { role: "user", content: "Do you ship to US, UK, and CA?", createdAt: "t", feedback: null },
    ];
    const csv = messagesToCsv(withComma);
    expect(csv).toContain('"Do you ship to US, UK, and CA?"');
  });

  it("escapes internal quotes by doubling them", () => {
    const withQuote: ExportableMessage[] = [
      { role: "user", content: 'They said "hello"', createdAt: "t", feedback: null },
    ];
    const csv = messagesToCsv(withQuote);
    expect(csv).toContain('"They said ""hello"""');
  });

  it("quotes fields containing newlines", () => {
    const withNewline: ExportableMessage[] = [
      { role: "user", content: "Line one\nLine two", createdAt: "t", feedback: null },
    ];
    const csv = messagesToCsv(withNewline);
    expect(csv).toContain('"Line one\nLine two"');
  });

  it("renders null feedback as an empty field, not the string 'null'", () => {
    const csv = messagesToCsv(sample);
    expect(csv).not.toContain("null");
  });

  it("handles an empty message list", () => {
    const csv = messagesToCsv([]);
    expect(csv).toBe("timestamp,role,content,feedback");
  });
});

describe("messagesToJson", () => {
  it("round-trips the input exactly", () => {
    const json = messagesToJson(sample);
    expect(JSON.parse(json)).toEqual(sample);
  });

  it("produces pretty-printed (indented) output", () => {
    const json = messagesToJson(sample);
    expect(json).toContain("\n  ");
  });
});
