import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  role: z.enum(["admin", "editor", "viewer"]), // owner is never assigned via invite
});
