import { gatewayComplete } from "./gateway";
import { z } from "zod";
import type { BotUseCase, BotTone, FallbackBehavior } from "@/lib/supabase/types";

export interface BotSynthesisInput {
  botName: string;
  useCase: BotUseCase;
  tone: BotTone;
  fallbackBehavior: FallbackBehavior;
  businessContext?: string;
}

export const synthesisResultSchema = z.object({
  systemPrompt: z.string().min(50),
  starterQuestions: z.array(z.string().min(3)).min(4).max(6),
  welcomeMessage: z.string().min(5).max(200),
});

export type BotSynthesisResult = z.infer<typeof synthesisResultSchema>;

const USE_CASE_BRIEF: Record<BotUseCase, string> = {
  customer_support:
    "answering customer support questions — troubleshooting, order/account issues, how-to questions",
  lead_gen:
    "qualifying and engaging potential customers, gathering their needs, and encouraging them toward a next step (demo, signup, contact)",
  faq: "answering frequently asked questions clearly and concisely",
  internal_docs:
    "helping employees find answers within internal company documentation",
  sales_assistant:
    "helping prospective customers understand a product and make a purchase decision",
};

const TONE_BRIEF: Record<BotTone, string> = {
  professional: "professional and polished, but not cold",
  friendly: "warm and conversational, like a helpful coworker",
  playful: "upbeat and a little playful, without undermining trust",
  formal: "formal and precise, minimal casual language",
  empathetic: "empathetic and patient, especially with frustrated users",
};

const FALLBACK_BRIEF: Record<FallbackBehavior, string> = {
  escalate_email:
    "tell the user it will connect them with a human via email and ask for their email address",
  apologize_contact:
    "apologize that it doesn't have that information and point them to contact support directly",
  say_dont_know:
    "say plainly that it doesn't know, without apologizing excessively or deflecting",
};

/**
 * Builds the meta-prompt: the instructions WE send to Gemini asking it to
 * write the bot's own system prompt. Pure and synchronous — no network
 * call — so this is unit-testable without hitting the API.
 */
export function buildSynthesisPrompt(input: BotSynthesisInput): {
  system: string;
  user: string;
} {
  const system = `You are an expert prompt engineer writing a system prompt for a customer-facing AI chatbot. The system prompt you write will be used verbatim by another instance of a language model to power a real chatbot embedded on a business's website.

The single most important property of the system prompt you write: it must instruct the bot to answer ONLY from retrieved knowledge-base content that will be injected into its context on every turn, and to invoke its configured fallback behavior whenever the retrieved content doesn't actually answer the question — never to fill gaps from general knowledge. This is a hard non-negotiable requirement in every prompt you write, regardless of use case or tone.

Respond with ONLY a JSON object, no markdown code fences, no preamble, matching exactly this shape:
{
  "systemPrompt": string,
  "starterQuestions": string[] (4 to 6 short example questions a visitor might click to start a conversation),
  "welcomeMessage": string (a short, friendly first message the bot sends when a chat opens)
}`;

  const user = `Write a system prompt for a chatbot named "${input.botName}".

Primary purpose: ${USE_CASE_BRIEF[input.useCase]}.
Tone: ${TONE_BRIEF[input.tone]}.
When the answer isn't in its knowledge base, it should: ${FALLBACK_BRIEF[input.fallbackBehavior]}.
${input.businessContext ? `Business context provided by the bot's creator: ${input.businessContext}` : ""}

The system prompt must explicitly instruct the bot to:
1. Answer only from knowledge-base content injected into context, never from general knowledge or assumptions.
2. Cite which source(s) it drew from when it answers.
3. Use the fallback behavior described above whenever retrieved content doesn't cover the question.
4. Maintain the specified tone consistently.
5. Keep answers concise and conversational — this is a chat widget, not a document.`;

  return { system, user };
}

/**
 * Parses and validates the model's response. Strips a markdown code fence if
 * the model wrapped the JSON in one despite instructions not to — models
 * do this often enough that defending against it is cheaper than a
 * failed generation. Throws a descriptive error on anything else
 * malformed, since a caller needs to know generation failed rather than
 * silently getting a garbage bot.
 */
export function parseSynthesisResponse(raw: string): BotSynthesisResult {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error(
      "Bot generation returned malformed JSON. Try again, or edit the prompt manually."
    );
  }

  const result = synthesisResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Bot generation response didn't match the expected shape: ${result.error.issues
        .map((i) => i.message)
        .join("; ")}`
    );
  }

  return result.data;
}

/**
 * The impure entry point — makes the real API call. Everything above
 * this function is pure and covered by unit tests; this function itself
 * needs a real GEMINI_API_KEY to verify against the live API.
 */
export async function synthesizeBotPrompt(
  input: BotSynthesisInput
): Promise<BotSynthesisResult> {
  const { system, user } = buildSynthesisPrompt(input);
  const response = await gatewayComplete({
    system,
    messages: [{ role: "user", content: user }],
    mode: "balanced",
    complexity: "normal",
  });
  if (!response.text) throw new Error("Bot generation returned no text content.");
  return parseSynthesisResponse(response.text);
    }
