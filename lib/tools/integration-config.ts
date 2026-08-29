import "server-only";
import crypto from "node:crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.TOOL_SECRET_KEY;
  if (!raw) throw new Error("Missing TOOL_SECRET_KEY. Configure a 32-byte secret for tool integrations.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("TOOL_SECRET_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptSecret(value: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64")}`;
}

export function decryptSecret(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
  const key = getKey();
  const payload = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function encryptConfig(config: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => [
    key,
    typeof value === "string" && /key|token|secret|password|authorization/i.test(key)
      ? encryptSecret(value)
      : value,
  ]));
}

export function decryptConfig(config: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => [
    key,
    typeof value === "string" && value.startsWith(PREFIX) ? decryptSecret(value) : value,
  ]));
}
