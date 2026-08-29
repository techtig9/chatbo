-- chatbo.ai — agent_runs.used_fallback (Phase 13, Analytics UI)
-- Spec section 75's KPI row includes Fallback Rate, but "did this run use
-- the configured fallback behavior" only ever existed as a transient SSE
-- field (stream-completion.ts's `done` event) — never persisted anywhere
-- queryable. Adds it alongside the other per-run flags (status, feedback)
-- agent_runs already tracks.
alter table agent_runs add column if not exists used_fallback boolean not null default false;
create index if not exists idx_agent_runs_fallback on agent_runs(workspace_id, used_fallback) where used_fallback;
