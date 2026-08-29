# Phase 14 — Public Developer API

## Included
- Versioned `/api/v1` developer surface
- API-key bearer authentication with read/write scopes
- 60 requests/minute per API key rate limit
- `X-Request-Id` response correlation
- `X-RateLimit-Limit` and `X-RateLimit-Remaining` on message responses
- `Idempotency-Key` support for safe message retries
- Agent CRUD
- Conversation creation
- Message execution through the same production agent runtime
- OpenAPI 3 reference at `/openapi.json`
- Developer portal at `/developers`

## Idempotency
`Idempotency-Key` is scoped to workspace + API key. The request body is SHA-256 hashed. Reusing a key with a different payload returns `409`. Reusing it with the same payload returns the stored response without running the agent again.

## Request lifecycle
`API key → scope → rate limit → validation → workspace/agent authorization → agent runtime → response`

## Security
API keys are hashed at rest. Agent access is checked against the authenticated workspace on every request. No provider secrets are exposed by this API.

## Next extensions
Streaming/SSE, official SDKs, usage endpoints, per-key quotas, API-managed webhooks, file/knowledge APIs, and API version negotiation can build on this foundation.
