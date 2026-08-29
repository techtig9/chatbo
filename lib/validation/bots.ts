import { z } from "zod";

export const botUseCaseValues = [
  "customer_support",
  "lead_gen",
  "faq",
  "internal_docs",
  "sales_assistant",
] as const;

export const botToneValues = [
  "professional",
  "friendly",
  "playful",
  "formal",
  "empathetic",
] as const;

export const fallbackBehaviorValues = [
  "escalate_email",
  "apologize_contact",
  "say_dont_know",
] as const;

export const createBotSchema = z.object({
  name: z.string().trim().min(1, "Give your bot a name").max(80),
  useCase: z.enum(botUseCaseValues),
  tone: z.enum(botToneValues),
  fallbackBehavior: z.enum(fallbackBehaviorValues),
  businessContext: z.string().trim().max(2000).optional(),
});

export type CreateBotInput = z.infer<typeof createBotSchema>;

export const widgetPositionValues = ["bottom-right", "bottom-left"] as const;

export const updateBotSchema = z.object({
  name: z.string().trim().min(1, "Give your bot a name").max(80),
  systemPrompt: z.string().trim().min(50, "System prompt is too short"),
  welcomeMessage: z.string().trim().min(1).max(200),
  tone: z.enum(botToneValues),
  fallbackBehavior: z.enum(fallbackBehaviorValues),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #0C0D09")
    .optional()
    .or(z.literal("")),
  widgetPosition: z.enum(widgetPositionValues),
  starterQuestions: z.array(z.string().min(1)).max(6),
  agentConfig: z.string().optional(),
});

export type UpdateBotInput = z.infer<typeof updateBotSchema>;
