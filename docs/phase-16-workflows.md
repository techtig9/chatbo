# Phase 16 — Workflow & Automation Engine

Chatbo.ai now includes a first-class workflow runtime for multi-step business automation.

## Architecture

Trigger → Node graph → AI / Condition / Action → Verification → End

## Supported nodes

- Trigger
- AI
- Condition
- HTTP request
- Webhook
- Email
- Delay
- Transform
- Human approval placeholder
- End

## Triggers

- Manual
- Webhook
- Conversation
- Schedule (configuration foundation)

## Runtime safeguards

- Maximum 50 nodes per run
- HTTP timeouts
- Run and step audit records
- Workspace isolation
- Failed-step capture
- Explicit active status for external triggers

## API

`POST /api/workflows/trigger` — API-key authenticated webhook-style trigger.

`POST /api/workflows/:workflowId/run` — authenticated dashboard/manual execution.

## Data model

- `workflows`
- `workflow_runs`
- `workflow_run_steps`

The workflow graph is stored as JSONB so the visual editor can evolve without repeatedly changing the relational schema.

## Next hardening

A future phase should add durable queues, scheduled execution, retries/backoff, parallel branches, human-approval persistence, secrets scoped per node, visual drag-and-drop editing, and replayable failed runs.
