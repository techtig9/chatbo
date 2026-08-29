import "server-only";
import { decryptConfig } from "@/lib/tools/integration-config";

export type ProviderChannel = "whatsapp" | "slack" | "discord" | "teams" | "email";
export type NormalizedInbound = { eventId?: string; externalUserId: string; text: string; replyTarget?: string };

function configOf(config: Record<string, unknown>) { return decryptConfig(config); }

export function normalizeProviderEvent(channel: ProviderChannel, raw: any): NormalizedInbound | null {
  if (channel === "slack") {
    if (raw.type === "url_verification") return null;
    const event = raw.event ?? raw;
    if (event.subtype || event.bot_id || event.type !== "message") return null;
    return { eventId: raw.event_id ?? event.ts, externalUserId: String(event.user ?? event.channel ?? ""), text: String(event.text ?? "").trim(), replyTarget: String(event.channel ?? "") };
  }
  if (channel === "discord") {
    const author = raw.author ?? raw.member?.user;
    return { eventId: raw.id, externalUserId: String(author?.id ?? ""), text: String(raw.content ?? "").trim(), replyTarget: String(raw.channel_id ?? "") };
  }
  if (channel === "whatsapp") {
    const value = raw.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message || message.type !== "text") return null;
    return { eventId: message.id, externalUserId: String(message.from ?? ""), text: String(message.text?.body ?? "").trim(), replyTarget: String(message.from ?? "") };
  }
  if (channel === "teams") return { eventId: raw.id, externalUserId: String(raw.from?.id ?? raw.from?.user?.id ?? ""), text: String(raw.text ?? raw.textContent ?? "").trim(), replyTarget: String(raw.conversation?.id ?? "") };
  return { eventId: raw.messageId ?? raw.id, externalUserId: String(raw.from ?? raw.sender ?? raw.externalUserId ?? ""), text: String(raw.text ?? raw.message?.text ?? "").trim(), replyTarget: String(raw.threadId ?? raw.to ?? "") };
}

export async function sendProviderReply(channel: ProviderChannel, config: Record<string, unknown>, target: string, text: string) {
  const c = configOf(config);
  if (channel === "slack") {
    const token = String(c.botToken ?? ""); if (!token) throw new Error("Slack botToken is not configured.");
    return providerFetch("https://slack.com/api/chat.postMessage", { token: `Bearer ${token}`, body: { channel: target, text } });
  }
  if (channel === "discord") {
    const webhookUrl = String(c.webhookUrl ?? ""); if (!webhookUrl) throw new Error("Discord webhookUrl is not configured.");
    return providerFetch(webhookUrl, { body: { content: text } });
  }
  if (channel === "whatsapp") {
    const token = String(c.accessToken ?? ""), phoneNumberId = String(c.phoneNumberId ?? "");
    if (!token || !phoneNumberId) throw new Error("WhatsApp accessToken and phoneNumberId are required.");
    return providerFetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, { token: `Bearer ${token}`, body: { messaging_product: "whatsapp", to: target, type: "text", text: { body: text } } });
  }
  if (channel === "teams") {
    const webhookUrl = String(c.webhookUrl ?? ""); if (!webhookUrl) throw new Error("Teams webhookUrl is not configured.");
    return providerFetch(webhookUrl, { body: { type: "message", text } });
  }
  const apiKey = String(process.env.RESEND_API_KEY ?? ""), from = String(c.from ?? "");
  if (!apiKey || !from) throw new Error("Email requires RESEND_API_KEY and a configured from address.");
  return providerFetch("https://api.resend.com/emails", { token: `Bearer ${apiKey}`, body: { from, to: target, subject: String(c.subject ?? "Chatbo AI response"), text } });
}

async function providerFetch(url: string, options: { token?: string; body: Record<string, unknown> }) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...(options.token ? { authorization: options.token } : {}) }, body: JSON.stringify(options.body), cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (typeof payload === "object" && payload && "ok" in payload && payload.ok === false)) throw new Error(typeof payload?.error === "string" ? payload.error : `Provider request failed (${response.status}).`);
  return payload;
}

export const PROVIDER_SETUP: Record<ProviderChannel, { required: string[]; docs: string }> = {
  whatsapp: { required: ["accessToken", "phoneNumberId", "verifyToken"], docs: "Meta WhatsApp Cloud API" },
  slack: { required: ["botToken", "signingSecret"], docs: "Slack Events API" },
  discord: { required: ["webhookUrl"], docs: "Discord webhook or bot adapter" },
  teams: { required: ["webhookUrl"], docs: "Microsoft Teams webhook adapter" },
  email: { required: ["from"], docs: "Resend inbound/outbound email adapter" },
};
