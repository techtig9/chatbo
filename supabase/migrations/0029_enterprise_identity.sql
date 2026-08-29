-- Phase 22: Enterprise identity, SSO, SCIM and security administration
create extension if not exists pgcrypto;

create table if not exists organization_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  domain text not null,
  verification_token text not null,
  status text not null default 'pending' check (status in ('pending','verified','disabled')),
  enforce_sso boolean not null default false,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  unique (organization_id, domain)
);

create table if not exists organization_sso_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider_type text not null check (provider_type in ('saml','oidc')),
  name text not null,
  issuer text,
  client_id text,
  client_secret_encrypted text,
  authorization_url text,
  token_url text,
  metadata_url text,
  entity_id text,
  sso_url text,
  certificate text,
  enabled boolean not null default false,
  enforce boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists organization_scim_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists organization_security_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  require_mfa boolean not null default false,
  enforce_sso boolean not null default false,
  restrict_to_verified_domains boolean not null default false,
  ip_allowlist text[] not null default '{}',
  session_timeout_minutes integer not null default 480 check (session_timeout_minutes between 15 and 10080),
  updated_at timestamptz not null default now()
);

create table if not exists organization_security_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid,
  event_type text not null,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists organization_domains_org_idx on organization_domains(organization_id);
create index if not exists organization_sso_configs_org_idx on organization_sso_configs(organization_id);
create index if not exists organization_scim_tokens_org_idx on organization_scim_tokens(organization_id);
create index if not exists organization_security_events_org_created_idx on organization_security_events(organization_id, created_at desc);

alter table organization_domains enable row level security;
alter table organization_sso_configs enable row level security;
alter table organization_scim_tokens enable row level security;
alter table organization_security_settings enable row level security;
alter table organization_security_events enable row level security;

create policy "org domains members" on organization_domains for select using (
  exists (select 1 from organization_members m where m.organization_id = organization_domains.organization_id and m.user_id = auth.uid())
);
create policy "org sso security admins" on organization_sso_configs for select using (
  exists (select 1 from organization_members m where m.organization_id = organization_sso_configs.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);
create policy "org security settings admins" on organization_security_settings for select using (
  exists (select 1 from organization_members m where m.organization_id = organization_security_settings.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);
create policy "org security events admins" on organization_security_events for select using (
  exists (select 1 from organization_members m where m.organization_id = organization_security_events.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','security_admin'))
);

-- SCIM secrets are never exposed through normal RLS reads; service-role code performs token verification.
create policy "org scim tokens admins" on organization_scim_tokens for select using (false);

-- Backfill security settings for existing organizations.
insert into organization_security_settings (organization_id)
select id from organizations
on conflict (organization_id) do nothing;
