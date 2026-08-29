import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
  visitorId: z.string().min(1).max(200),
  channel: z.enum(["widget", "share_link"]),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
