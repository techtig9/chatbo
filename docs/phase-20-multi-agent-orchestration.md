# Phase 20 — Multi-Agent Orchestration

Phase 20 adds bounded orchestration on top of Phase 19 agent delegation.

## Modes
- **Supervisor**: an AI planner chooses only explicitly connected specialists.
- **Parallel**: connected specialists run concurrently.
- **Sequential**: connected specialists run in priority order.

## Safety
- Workspace isolation.
- Explicit relationship allow-list; no arbitrary target selection.
- Maximum delegation depth.
- Maximum agents per orchestration.
- Maximum estimated cost budget.
- Per-agent delegation budgets from Phase 19.
- Input-size limits from Phase 19.
- Dependency cycle detection.
- Idempotency key support for API clients.
- Server-side plan validation; model output never grants itself new permissions.

## Execution model
`Supervisor → validated plan → specialist delegations → result aggregation → supervisor synthesis`.

Parallel mode uses `Promise.allSettled` so failures are observable and the run is marked failed rather than silently ignored. Sequential/supervisor modes resolve dependencies before a step runs.

## API
`POST /api/multi-agent/orchestrate`

Body:
```json
{
  "sourceBotId": "agent-id",
  "task": "Research this lead and recommend the next action.",
  "mode": "supervisor",
  "context": {}
}
```

Optional `Idempotency-Key` prevents accidental duplicate orchestration submissions.

## Production direction
The orchestration data model is designed to support durable background execution, richer supervisor policies, distributed queues, and multi-agent traces in a later infrastructure phase.
