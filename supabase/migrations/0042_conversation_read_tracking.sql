-- chatbo.ai — conversation read tracking (Phase 11, Conversations UI)
-- Spec section 73's list tabs are All / Unread / Unresolved / Resolved /
-- Handoff, but there was no concept of "read" anywhere in the schema —
-- conversations had no way to know whether anyone on the team had looked
-- at them yet. Single team-wide read_at (not per-user) matches how this
-- app models a workspace team today: one shared inbox, not per-agent
-- ticket assignment, so "has anyone looked at this" is the right
-- granularity rather than a per-user join table.
alter table conversations add column if not exists read_at timestamptz;
create index if not exists idx_conversations_read_at on conversations(read_at) where read_at is null;
