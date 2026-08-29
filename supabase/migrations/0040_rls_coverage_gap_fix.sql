-- chatbo.ai — RLS coverage gap fix (Phase 2 Supabase security audit)
--
-- Cross-checking every `create table` in supabase/migrations against every
-- `alter table ... enable row level security` found five tables that were
-- created without RLS ever being enabled on them. Without RLS, access is
-- governed only by the standard authenticated/anon role grants Supabase
-- applies to the public schema by default — meaning any authenticated user
-- could read (and in some cases write) every workspace's rows, not just
-- their own.
--
-- This is a live, exploitable gap for knowledge_bases and
-- knowledge_retrieval_events specifically: app/dashboard/knowledge/page.tsx
-- queries both through the user-scoped (RLS-respecting-when-present)
-- Supabase client, filtered client-side by workspace_id — a filter that is
-- only enforced because the caller chose to add it, not because the
-- database required it. knowledge_ingestion_jobs and
-- knowledge_source_permissions aren't wired into any app code yet, but are
-- fixed now rather than left as a landmine for whoever wires them up next.
-- templates has no workspace_id (it's a global, non-tenant catalog) so it
-- gets a public-read policy instead of a workspace-membership one.

alter table knowledge_bases enable row level security;
alter table knowledge_ingestion_jobs enable row level security;
alter table knowledge_retrieval_events enable row level security;
alter table knowledge_source_permissions enable row level security;
alter table templates enable row level security;

create policy "members read knowledge bases" on knowledge_bases
  for select using (is_workspace_member(workspace_id));
create policy "editors+ write knowledge bases" on knowledge_bases
  for all using (
    exists (
      select 1 from workspace_members
      where workspace_id = knowledge_bases.workspace_id
        and user_id = auth.uid()
        and role in ('owner','admin','editor')
    )
  );

-- Ingestion jobs are created and progressed by the ingestion worker only
-- (via the service-role client, which bypasses RLS entirely) — members get
-- read access to see job status, no direct-write policy is needed for the
-- authenticated role.
create policy "members read knowledge ingestion jobs" on knowledge_ingestion_jobs
  for select using (is_workspace_member(workspace_id));

-- Retrieval telemetry is written by the retrieval pipeline only (service
-- role) — same reasoning as ingestion jobs above.
create policy "members read knowledge retrieval events" on knowledge_retrieval_events
  for select using (is_workspace_member(workspace_id));

create policy "members read knowledge source permissions" on knowledge_source_permissions
  for select using (
    exists (select 1 from bots where bots.id = knowledge_source_permissions.bot_id and is_workspace_member(bots.workspace_id))
  );
create policy "editors+ write knowledge source permissions" on knowledge_source_permissions
  for all using (
    exists (
      select 1 from bots
      join workspace_members on workspace_members.workspace_id = bots.workspace_id
      where bots.id = knowledge_source_permissions.bot_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner','admin','editor')
    )
  );

-- templates is a global catalog (no workspace_id) — readable by any
-- authenticated user, writable only by the service role (no write policy).
create policy "authenticated users read templates" on templates
  for select using (auth.role() = 'authenticated');
