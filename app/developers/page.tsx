export const dynamic = "force-static";

const ENDPOINTS = [
  ["GET", "/api/v1/bots", "List agents"],
  ["POST", "/api/v1/bots", "Create an agent"],
  ["GET", "/api/v1/bots/{id}", "Get an agent"],
  ["PATCH", "/api/v1/bots/{id}", "Update an agent"],
  ["POST", "/api/v1/bots/{id}/conversations", "Start a conversation"],
  ["POST", "/api/v1/bots/{id}/messages", "Send a message and receive a response"],
  ["POST", "/api/v1/bots/{id}/stream", "Stream an agent response over SSE"],
  ["GET", "/api/v1/conversations", "List conversations"],
] as const;

const COLORS: Record<string, string> = { GET: "bg-signal-soft text-ink", POST: "bg-ink/10 text-ink", PATCH: "bg-warning-soft text-ember-ink" };

export default function DevelopersPage() {
  return (
    <main className="min-h-screen bg-paper">
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink">Developer Platform</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Put any Chatbo agent inside your product.</h1>
          <p className="mt-4 text-base leading-7 text-slate">Use the public API to create agents, start conversations, send messages, and build your own AI-powered experiences. Every request is authenticated, rate-limited, observable, and returns an <code>X-Request-Id</code>.</p>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-3">
          {[
            ["Authentication", "Bearer cb_live_… API keys with read/write scopes"],
            ["Rate limits", "60 requests/minute per API key by default"],
            ["Idempotency", "Use Idempotency-Key for safe retries on writes"],
          ].map(([title, body]) => <div key={title} className="rounded-2xl border border-mist bg-surface p-5"><h2 className="font-medium text-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-slate">{body}</p></div>)}
        </div>

        <div className="rounded-2xl border border-mist bg-surface p-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="font-display text-xl font-semibold text-ink">API reference</h2><a href="/openapi.json" className="text-sm font-medium text-ink hover:underline">Open OpenAPI spec</a></div>
          <div className="space-y-2">
            {ENDPOINTS.map(([method, path, desc]) => <div key={`${method}-${path}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-mist px-4 py-3"><span className={`w-16 rounded px-2 py-1 text-center font-mono text-xs font-semibold ${COLORS[method]}`}>{method}</span><code className="font-mono text-sm text-ink">{path}</code><span className="ml-auto text-xs text-slate">{desc}</span></div>)}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div><h2 className="mb-3 font-display text-xl font-semibold text-ink">Quick start</h2><pre className="overflow-x-auto rounded-xl bg-ink p-5 text-xs leading-6 text-paper">{`curl -X POST https://YOUR_DOMAIN/api/v1/bots/BOT_ID/messages \\\n  -H "Authorization: Bearer cb_live_..." \\\n  -H "Idempotency-Key: order-123" \\\n  -H "Content-Type: application/json" \\\n  -d '{"message":"Where is my order?"}'`}</pre></div>
          <div><h2 className="mb-3 font-display text-xl font-semibold text-ink">Response contract</h2><pre className="overflow-x-auto rounded-2xl border border-mist bg-surface p-5 text-xs leading-6 text-slate">{`{
  "data": {
    "reply": "Your order is on the way.",
    "conversationId": "...",
    "creditsRemaining": 980
  }
}`}</pre></div>
        </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
          <a href="/openapi.json" className="rounded-2xl border border-mist bg-surface p-5 hover:border-signal"><h2 className="font-medium text-ink">OpenAPI</h2><p className="mt-2 text-sm text-slate">Generate clients or import the API into Postman.</p></a>
          <a href="/dashboard/developers/usage" className="rounded-2xl border border-mist bg-surface p-5 hover:border-signal"><h2 className="font-medium text-ink">Usage & logs</h2><p className="mt-2 text-sm text-slate">Inspect model usage, latency, cost and request success.</p></a>
          <div className="rounded-2xl border border-mist bg-surface p-5"><h2 className="font-medium text-ink">Official SDKs</h2><p className="mt-2 text-sm text-slate">TypeScript and Python SDK source is included in the project under <code>sdk/</code>.</p></div>
        </div>
      </section>
    </main>
  );
}
