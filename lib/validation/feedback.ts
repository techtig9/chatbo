import { z } from "zod";

export const feedbackSchema = z.object({
  feedback: z.enum(["up", "down"]),
});
