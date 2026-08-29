-- chatbo.ai — Paddle webhook event idempotency (Phase 2 gap fix)
-- 0006_payment_idempotency.sql only protects transaction.completed (via a
-- unique constraint on payments.paddle_transaction_id). subscription.created
-- / subscription.updated have no dedup at all: a redelivered
-- subscription.updated (Paddle retries on any non-2xx response or timeout,
-- delivery is at-least-once, not exactly-once) re-runs reset_monthly_credits
-- and hands the workspace a free mid-cycle credit refill. This table lets
-- the webhook route record every event_id it has actually finished
-- processing and skip a redelivery outright, for every event type.
create table if not exists paddle_webhook_events (
  event_id text primary key,
  event_type text not null,
  workspace_id uuid references workspaces(id) on delete set null,
  received_at timestamptz default now()
);
create index if not exists idx_paddle_webhook_events_workspace on paddle_webhook_events(workspace_id, received_at desc);
alter table paddle_webhook_events enable row level security;
-- Service-role only (the webhook route uses the admin client) — no
-- workspace member ever needs to query this directly, so no policy grants
-- access; RLS with zero policies denies all non-service-role access.
