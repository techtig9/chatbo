# Phase 15 — SDKs, Streaming & Developer Experience

## Delivered
- Official TypeScript SDK source under `sdk/typescript`.
- Official Python SDK source under `sdk/python`.
- SSE endpoint: `POST /api/v1/bots/{id}/stream`.
- SDK streaming helpers that expose `conversation`, `tool_call`, `token`, `gateway`, `done`, and `error` events.
- Developer usage dashboard at `/dashboard/developers/usage`.
- OpenAPI documentation updated with the streaming endpoint.
- SDK error objects preserve HTTP status and `X-Request-Id` when available.

## Streaming contract
The stream uses Server-Sent Events. Each frame is:

`event: <name>`
`data: <JSON>`

The existing agent runtime emits structured events, so developers can render progress without parsing model text.

## SDK examples

### TypeScript
```ts
import { Chatbo } from '@chatbo-ai/sdk';
const client = new Chatbo({ apiKey: process.env.CHATBO_API_KEY! });
const response = await client.chat('AGENT_ID', { message: 'Hello!' });
```

### Python
```python
from chatbo import Chatbo
client = Chatbo(api_key="cb_live_...")
response = client.chat("AGENT_ID", "Hello!")
```

## Security
API keys remain server-side. SDKs never expose provider credentials. Streaming requests use the same API-key authentication, scope checks, rate limits, usage limits, security policies and observability as normal API requests.

## Production notes
- Use `Idempotency-Key` with non-streaming writes that may be retried.
- Streaming is intentionally not idempotent because SSE connections are long-lived; reconnecting clients should resume using a stored `conversationId` and their own application-level message IDs.
- Pin SDK versions in production.
