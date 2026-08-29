import { z } from "zod";
import { botUseCaseValues, botToneValues, fallbackBehaviorValues } from "./bots";

export const apiCreateBotSchema = z.object({
  name: z.string().trim().min(1).max(80),
  useCase: z.enum(botUseCaseValues),
  tone: z.enum(botToneValues),
  fallbackBehavior: z.enum(fallbackBehaviorValues),
  businessContext: z.string().trim().max(2000).optional(),
});

export const apiUpdateBotSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const apiSendMessageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
});
