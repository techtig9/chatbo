import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { ChatHistoryTurn } from "@/lib/chat/assemble";

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Set it in .env.local — every bot-generation " +
        "and chat feature needs it."
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

// Flash, not Pro — per-message-billed chatbot usage pattern.
export const CHAT_MODEL = "gemini-3.5-flash";

/**
 * assembleChatRequest (lib/chat/assemble.ts) still produces
 * Anthropic-shaped output (role: "user"|"assistant", flat content
 * string) — this adapter bridges to Gemini's shape (role:
 * "user"|"model", parts: [{text}]) without touching that pure/tested
 * function.
 */
export function toGeminiContents(
  messages: ChatHistoryTurn[]
): { role: "user" | "model"; parts: { text: string }[] }[] {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}
