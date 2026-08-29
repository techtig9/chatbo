# Phase 27 — Advanced Integrations & Integration Marketplace

## Delivered
- First-party integration catalog for Slack, Shopify, Stripe, HubSpot, Salesforce, Zendesk, Google Workspace, Microsoft 365, Notion and Discord.
- OAuth 2.0 connection start/callback abstraction.
- Cryptographically random OAuth state with SHA-256 storage and 10-minute expiry.
- Encrypted access/refresh token storage using the existing AES-256-GCM secret helper.
- Workspace-scoped connection records and RLS.
- Agent-level integration permission records.
- Integration action catalog with read/write/sensitive permissions.
- Connection health API and dashboard.
- Disconnect support that removes stored credentials from the active connection.
- Webhook subscription schema for future provider event ingestion.

## Security model
Provider secrets remain server-side. OAuth state is single-use and expires quickly. Connection records are workspace scoped. Agent access is represented separately from the connection itself, so a connected account is not automatically available to every agent.

## Provider configuration
Each provider uses `<PREFIX>_CLIENT_ID` and `<PREFIX>_CLIENT_SECRET`. Provider redirect URI should point to `/api/integrations/callback` on the deployed application. Providers whose authorization/token endpoints vary by tenant should use the catalog's configurable environment URL overrides.

## Production hardening before broad marketplace launch
- Add PKCE for providers that require it.
- Implement provider-specific token refresh adapters.
- Add OAuth revocation endpoints where providers expose them.
- Add SSRF-safe webhook ingestion and signature verification per provider.
- Add provider-specific API clients/actions rather than treating OAuth connection as action execution.
- Add per-provider rate-limit/backoff policies.
- Add integration health probes without leaking secrets.
- Add custom OAuth app registration UI for enterprise tenants.
