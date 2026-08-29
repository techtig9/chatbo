export type ChatResponse = { data: { reply: string; conversationId: string; creditsRemaining?: number | null; [key: string]: unknown } };
export type ChatRequest = { message: string; conversationId?: string };
export type StreamEvent = { event: string; data: unknown };

export class ChatboError extends Error {
  constructor(public status: number, message: string, public requestId?: string) { super(message); this.name = "ChatboError"; }
}

export class Chatbo {
  private baseUrl: string;
  constructor(private options: { apiKey: string; baseUrl?: string; fetch?: typeof fetch }) {
    if (!options.apiKey) throw new Error("Chatbo apiKey is required");
    this.baseUrl = (options.baseUrl || "https://api.chatbo.ai").replace(/\/$/, "");
  }

  private get fetcher() { return this.options.fetch || fetch; }
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json", ...(init.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new ChatboError(response.status, payload.error || "Chatbo API request failed", response.headers.get("X-Request-Id") || undefined);
    return payload as T;
  }

  async chat(agentId: string, request: ChatRequest, options?: { idempotencyKey?: string }): Promise<ChatResponse> {
    const headers: Record<string, string> = {};
    if (options?.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
    return this.request<ChatResponse>(`/api/v1/bots/${encodeURIComponent(agentId)}/messages`, { method: "POST", headers, body: JSON.stringify(request) });
  }

  async createConversation(agentId: string, visitorId?: string) {
    return this.request<{ data: { conversationId: string } }>(`/api/v1/bots/${encodeURIComponent(agentId)}/conversations`, { method: "POST", body: JSON.stringify(visitorId ? { visitorId } : {}) });
  }

  async *stream(agentId: string, request: ChatRequest): AsyncGenerator<StreamEvent> {
    const response = await this.fetcher(`${this.baseUrl}/api/v1/bots/${encodeURIComponent(agentId)}/stream`, { method: "POST", headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify(request) });
    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => ({}));
      throw new ChatboError(response.status, payload.error || "Chatbo streaming request failed", response.headers.get("X-Request-Id") || undefined);
    }
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n"); buffer = frames.pop() || "";
      for (const frame of frames) {
        const event = frame.match(/^event: (.+)$/m)?.[1] || "message";
        const dataLine = frame.match(/^data: (.+)$/m)?.[1]; if (!dataLine) continue;
        yield { event, data: JSON.parse(dataLine) };
      }
    }
  }
}
