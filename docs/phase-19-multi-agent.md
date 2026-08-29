# Phase 19 — Multi-Agent Collaboration

Chatbo now supports bounded agent-to-agent delegation inside a workspace.

## Architecture

Supervisor agent → explicitly allowed specialist agent → delegated task → structured result → supervisor/workflow.

## Security

- Delegation is deny-by-default.
- Source and target agents must belong to the same workspace.
- Relationships have per-hour call budgets and input-size limits.
- Target system prompts remain server-side.
- Delegated actions do not inherit arbitrary tools or credentials from the caller.
- Delegation history is stored for observability and auditing.

## Workflow integration

The visual workflow engine now supports an `agent` node with `targetBotId` and `task`. The node calls the same bounded delegation service used by the Multi-Agent dashboard.

## Recommended production expansion

Add durable parallel delegation, result aggregation, agent-specific tool scopes, cross-agent trace spans, supervisor planning, and human approval for high-risk delegated actions.
