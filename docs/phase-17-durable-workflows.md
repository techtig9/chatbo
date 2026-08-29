# Phase 17 — Durable Workflow Infrastructure & Visual Builder

Phase 17 upgrades the Phase 16 workflow foundation with a visual no-code editor and background execution through Inngest.

## Visual builder
- Drag nodes on a canvas.
- Add Trigger, AI, Condition, HTTP, Email, Webhook, Delay, Transform, Human Approval and End nodes.
- Select nodes to edit configuration.
- Double-click another node to create an edge.
- Advanced JSON editing remains available for power users.

## Durable execution
- Manual durable runs are persisted as `queued` before an Inngest event is emitted.
- The background function retries transient failures up to three times.
- Concurrency is capped at 20 by default.
- Existing workflow runs can be resumed without creating a second run record.
- Previously successful nodes are reused on a retry to reduce duplicate side effects.
- Long delay nodes use Inngest durable sleep when executed through the durable path.
- Run cancellation is checked before each node.

## Production controls
Workflows expose execution settings for mode, concurrency, retries and timeout. The database stores queue time, attempt count, cancellation time and optional idempotency keys.

## Operational model
`Trigger → queued run → background worker → node checkpoints → output → observability`

For external production providers, configure Inngest signing/event credentials and deploy the `/api/inngest` route.
