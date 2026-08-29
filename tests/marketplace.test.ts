import { describe, expect, it } from "vitest";
import { sanitizeManifest, slugifyMarketplaceTitle } from "@/lib/marketplace/catalog";

describe("agent marketplace manifest", () => {
  it("redacts secret-like configuration keys", () => {
    const result = sanitizeManifest({
      schemaVersion: 1, title: "Sales Agent", description: "x", category: "sales", tags: [" Sales ", "AI"], license: "standard",
      requirements: { integrations: [], knowledgeSources: 0, workflows: 0 },
      agent: { useCase: "sales", tone: "professional", model: "model", systemPrompt: "hello", agentConfig: { apiKey: "secret", nested: { token: "secret2" }, safe: true }, welcomeMessage: null, starterQuestions: [] },
    });
    expect(result.agent.agentConfig).toEqual({ apiKey: "[REDACTED]", nested: { token: "[REDACTED]" }, safe: true });
    expect(result.tags).toEqual(["sales", "ai"]);
  });

  it("creates deterministic readable slugs", () => {
    expect(slugifyMarketplaceTitle("My Amazing Sales Agent!")).toBe("my-amazing-sales-agent");
    expect(slugifyMarketplaceTitle("***")).toBe("agent-template");
  });
});
