-- chatbo.ai — payment idempotency (Phase 1.8)
-- Paddle retries webhook deliveries on timeout/5xx, and the original
-- payments table had no unique constraint to detect a retry of an
-- already-processed transaction — caught while wiring up the webhook
-- handler, which would otherwise double-log (and double-count revenue
-- for) every retried delivery.

alter table payments add constraint payments_paddle_transaction_id_unique unique (paddle_transaction_id);
