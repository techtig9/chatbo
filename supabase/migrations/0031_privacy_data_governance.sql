-- Phase 24: Privacy, Data Governance & Data Subject Request foundation
create table if not exists organization_privacy_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  pii_detection_enabled boolean not null default true,
  redact_sensitive_logs boolean not null default true,
  consent_required_for_training boolean not null default true,
  data_residency text not null default 'global' check (data_residency in ('global','us','eu')),
  updated_at timestamptz not null default now()
);

create table if not exists organization_data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  requested_by_user_id uuid references users(id),
  subject_user_id uuid references users(id),
  request_type text not null check (request_type in ('export','deletion','access','rectification','restriction')),
  status text not null default 'pending' check (status in ('pending','processing','completed','rejected','cancelled')),
  reason text,
  requested_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  completed_by_user_id uuid references users(id),
  result_metadata jsonb not null default '{}'::jsonb
);

create table if not exists organization_consent_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references users(id),
  purpose text not null,
  status text not null check (status in ('granted','withdrawn')),
  policy_version text not null default '1.0',
  source text not null default 'chatbo',
  created_at timestamptz not null default now()
);

create table if not exists organization_retention_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  dry_run boolean not null default true,
  records_eligible bigint not null default 0,
  records_deleted bigint not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error text
);

create index if not exists org_dsr_org_status_idx on organization_data_subject_requests(organization_id,status,requested_at desc);
create index if not exists org_dsr_subject_idx on organization_data_subject_requests(subject_user_id,requested_at desc);
create index if not exists org_consent_user_idx on organization_consent_records(organization_id,user_id,created_at desc);
create index if not exists org_retention_runs_idx on organization_retention_runs(organization_id,created_at desc);

alter table organization_privacy_settings enable row level security;
alter table organization_data_subject_requests enable row level security;
alter table organization_consent_records enable row level security;
alter table organization_retention_runs enable row level security;

create policy "privacy settings security admins" on organization_privacy_settings for select using (
  exists (select 1 from organization_members m where m.organization_id = organization_privacy_settings.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);
create policy "privacy settings security admins update" on organization_privacy_settings for update using (
  exists (select 1 from organization_members m where m.organization_id = organization_privacy_settings.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);
create policy "dsr security admins" on organization_data_subject_requests for select using (
  exists (select 1 from organization_members m where m.organization_id = organization_data_subject_requests.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);
create policy "consent security admins" on organization_consent_records for select using (
  exists (select 1 from organization_members m where m.organization_id = organization_consent_records.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);
create policy "retention security admins" on organization_retention_runs for select using (
  exists (select 1 from organization_members m where m.organization_id = organization_retention_runs.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);

insert into organization_privacy_settings (organization_id)
select id from organizations on conflict (organization_id) do nothing;

create policy "dsr organization members create own" on organization_data_subject_requests for insert with check (
  requested_by_user_id = auth.uid() and exists (
    select 1 from organization_members m where m.organization_id = organization_data_subject_requests.organization_id and m.user_id = auth.uid()
  )
);
create policy "dsr security admins update" on organization_data_subject_requests for update using (
  exists (select 1 from organization_members m where m.organization_id = organization_data_subject_requests.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);
create policy "retention security admins insert" on organization_retention_runs for insert with check (
  exists (select 1 from organization_members m where m.organization_id = organization_retention_runs.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);
