# Phase 4 — Tool & Action Engine

Phase 4 adds the secure foundation for agents that can take actions instead of only generating text.

## Included
- Central tool registry with explicit schemas and permission levels.
- Per-agent tool enable/disable state stored in Supabase.
- Read, write and sensitive permission tiers.
- Server-only tool executor.
- Disabled-tool blocking.
- Tool execution audit records with input, output/error and duration.
- Knowledge-search tool is fully executable and reuses the existing RAG retrieval pipeline.
- External-action tool definitions for email, support tickets, order status and human handoff.
- Dashboard tool controls inside the Agent Builder.
- Tool/integration overview page.
- Authenticated dashboard endpoint for safe tool testing.

## Safety model
Tools are disabled by default. A tool must be explicitly enabled for an agent. The executor checks configuration server-side before every run. Sensitive tools are visually separated and should only be connected to a real external integration after credentials and approval policies are configured.

## Next integration work
The external tools currently return a clear "integration required" result rather than pretending to send an email, modify an order, or create a ticket. The next phase should add real connector credentials, OAuth/API authentication, input validation, retries, idempotency and provider-specific execution.
