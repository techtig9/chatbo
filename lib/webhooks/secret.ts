import { randomBytes } from "crypto";

/** Generates a webhook signing secret, shown once at endpoint creation. */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}
