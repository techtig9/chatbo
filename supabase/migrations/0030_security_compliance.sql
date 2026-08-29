-- Phase 23: Enterprise Security Center, immutable audit trail and compliance controls
create table if not exists organization_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_user_id uuid references users(id),
  event_type text not null,
  action text not null,
  target_type text,
  target_id uuid,
  result text not null default 'success' check (result in ('success','failure','denied')),
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists organization_compliance_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  audit_retention_days integer not null default 365 check (audit_retention_days between 30 and 3650),
  data_retention_days integer not null default 365 check (data_retention_days between 30 and 3650),
  export_enabled boolean not null default true,
  deletion_requests_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists organization_audit_events_org_created_idx on organization_audit_events(organization_id, created_at desc);
create index if not exists organization_audit_events_type_idx on organization_audit_events(organization_id, event_type, created_at desc);
create index if not exists organization_audit_events_actor_idx on organization_audit_events(actor_user_id, created_at desc);

alter table organization_audit_events enable row level security;
alter table organization_compliance_settings enable row level security;

create policy "org audit security admins" on organization_audit_events for select using (
  exists (select 1 from organization_members m where m.organization_id = organization_audit_events.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);

create policy "org compliance security admins" on organization_compliance_settings for select using (
  exists (select 1 from organization_members m where m.organization_id = organization_compliance_settings.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);

insert into organization_compliance_settings (organization_id)
select id from organizations
on conflict (organization_id) do nothing;

-- Security/audit events are intentionally append-only through server-side service-role code.
