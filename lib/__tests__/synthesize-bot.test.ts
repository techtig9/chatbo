import { describe, it, expect } from "vitest";
import {
  buildSynthesisPrompt,
  parseSynthesisResponse,
} from "@/lib/ai/synthesize-bot";

describe("buildSynthesisPrompt", () => {
  const baseInput = {
    botName: "Candle Co Assistant",
    useCase: "customer_support" as const,
    tone: "friendly" as const,
    fallbackBehavior: "escalate_email" as const,
  };

  it("includes the bot name in the user prompt", () => {
    const { user } = buildSynthesisPrompt(baseInput);
    expect(user).toContain("Candle Co Assistant");
  });

  it("always instructs groundedness as non-negotiable, regardless of use case", () => {
    const { system } = buildSynthesisPrompt(baseInput);
    expect(system.toLowerCase()).toContain("retrieved knowledge-base content");
    expect(system.toLowerCase()).toContain("never");
  });

  it("includes the correct fallback instruction for the chosen behavior", () => {
    const { user } = buildSynthesisPrompt(baseInput);
    expect(user).toContain("connect them with a human via email");
  });

  it("includes different fallback instructions for a different behavior", () => {
    const { user } = buildSynthesisPrompt({
      ...baseInput,
      fallbackBehavior: "say_dont_know",
    });
    expect(user).toContain("say plainly that it doesn't know");
    expect(user).not.toContain("connect them with a human via email");
  });

  it("includes optional business context only when provided", () => {
    const withContext = buildSynthesisPrompt({
      ...baseInput,
      businessContext: "we sell handmade soy candles",
    });
    expect(withContext.user).toContain("handmade soy candles");

    const withoutContext = buildSynthesisPrompt(baseInput);
    expect(withoutContext.user).not.toContain("Business context provided");
  });

  it("requires the response to be JSON-only with no markdown fences", () => {
    const { system } = buildSynthesisPrompt(baseInput);
    expect(system).toContain("no markdown code fences");
  });
});

describe("parseSynthesisResponse", () => {
  const validPayload = {
    systemPrompt:
      "You are a helpful assistant for Candle Co. Answer only from retrieved knowledge...",
    starterQuestions: [
      "What scents do you offer?",
      "Do you ship internationally?",
      "How do I track my order?",
      "What's your return policy?",
    ],
    welcomeMessage: "Hi! How can I help you today?",
  };

  it("parses a clean JSON response", () => {
    const result = parseSynthesisResponse(JSON.stringify(validPayload));
    expect(result.systemPrompt).toContain("Candle Co");
    expect(result.starterQuestions).toHaveLength(4);
  });

  it("strips a markdown code fence the model added despite instructions not to", () => {
    const fenced = "```json\n" + JSON.stringify(validPayload) + "\n```";
    const result = parseSynthesisResponse(fenced);
    expect(result.welcomeMessage).toBe("Hi! How can I help you today?");
  });

  it("strips a fence with no language tag", () => {
    const fenced = "```\n" + JSON.stringify(validPayload) + "\n```";
    const result = parseSynthesisResponse(fenced);
    expect(result.systemPrompt).toContain("Candle Co");
  });

  it("throws a descriptive error on malformed JSON", () => {
    expect(() => parseSynthesisResponse("not json at all")).toThrow(/malformed JSON/);
  });

  it("throws when starterQuestions has fewer than 4 items", () => {
    const bad = { ...validPayload, starterQuestions: ["Only one question?"] };
    expect(() => parseSynthesisResponse(JSON.stringify(bad))).toThrow(
      /didn't match the expected shape/
    );
  });

  it("throws when starterQuestions has more than 6 items", () => {
    const bad = {
      ...validPayload,
      starterQuestions: Array(7).fill("A question?"),
    };
    expect(() => parseSynthesisResponse(JSON.stringify(bad))).toThrow();
  });

  it("throws when systemPrompt is too short to be a real prompt", () => {
    const bad = { ...validPayload, systemPrompt: "Too short" };
    expect(() => parseSynthesisResponse(JSON.stringify(bad))).toThrow();
  });

  it("throws when a required field is missing entirely", () => {
    const { welcomeMessage, ...missingWelcome } = validPayload;
    expect(() => parseSynthesisResponse(JSON.stringify(missingWelcome))).toThrow();
  });
});
