-- chatbo.ai — bots.archived status (Phase 8, Agents page)
-- Spec section 69's Agents page filters are All / Published / Draft /
-- Archived / Needs attention, but bots.status only ever allowed
-- ('draft','published') — there was no way to retire an agent without
-- permanently deleting it. Widens the constraint; existing rows are
-- unaffected since 'archived' is additive.
alter table bots drop constraint bots_status_check;
alter table bots add constraint bots_status_check check (status in ('draft', 'published', 'archived'));
