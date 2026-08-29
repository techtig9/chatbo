# Phase 12 — Omnichannel Communication

## Goal
Deploy one AI agent across website, hosted chat, API, WhatsApp, Slack, Discord, Microsoft Teams and email while preserving a shared agent brain.

## Architecture
Channel adapter -> signature verification -> normalized event -> conversation -> memory/RAG/model/tools -> normalized response -> channel adapter.

## Implemented
- Channel connection model and workspace isolation
- Per-agent channel dashboard
- Website/hosted/API channel inventory
- Connector configuration records for WhatsApp, Slack, Discord, Teams and email
- Server-side webhook secrets
- HMAC verification for normalized connector webhooks
- Inbound message normalization
- Shared conversation creation/reuse
- Shared non-streaming agent completion
- Channel event audit records
- Connected/paused/disconnected states
- Workspace Channels overview

## Provider integration contract
Provider-specific OAuth, webhook challenge verification, outbound API delivery and media adapters should be configured per provider. The unified inbound contract is:
`{ eventId, externalUserId, text, ... }`.

## Production flow
1. Receive provider event.
2. Verify provider signature/challenge.
3. Normalize message.
4. Resolve bot + connection.
5. Reuse or create conversation.
6. Run the same agent brain used by web/API.
7. Deliver the normalized response through the provider adapter.
8. Record event, trace, cost and outcome.

## Security
Connector secrets never belong in client code. Production provider credentials should be encrypted using the platform secret manager. Every channel event is tenant-scoped.
