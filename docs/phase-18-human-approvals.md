# Phase 18 — Human-in-the-Loop & Approval Center

Chatbo workflows can pause at a `human_approval` node and create a durable approval request.

## Flow

Trigger → AI/Tool → Human Approval → Approval Center → Approve/Reject → Resume or Fail

## Approval policy

- `approverRole`: owner, admin, or editor
- `expirationMinutes`: request expiry window
- `actionType`: business label such as refund, publish, external_write
- `payload`: structured action preview shown to the approver

## Security

Approval decisions are workspace-scoped and require the `workflow:approve` permission. The current minimum role is editor; the approval request can require a higher role. The server rechecks both workspace membership and required role before changing state.

## Durable resume

An approved request changes the workflow run back to `queued` and emits `chatbo/workflow.approval.resolved`. The durable worker resumes the same run and reuses the completed approval step rather than creating a duplicate run.

## Notifications

Eligible workspace members receive an in-app notification when an approval is created.
