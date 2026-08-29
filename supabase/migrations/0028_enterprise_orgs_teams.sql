-- Phase 21: Enterprise organizations, teams and fine-grained permissions.
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists organization_workspaces (
  organization_id uuid not null references organizations(id) on delete cascade,
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','security_admin','billing_admin','developer','analyst','member','viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('lead','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists organization_permissions (
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null,
  permission text not null,
  enabled boolean not null default true,
  primary key (organization_id, role, permission)
);

-- Backfill one organization per existing workspace, preserving the current model.
insert into organizations (name, owner_id)
select w.name, w.owner_id from public.workspaces w
where not exists (select 1 from organizations o where o.owner_id = w.owner_id and o.name = w.name);

insert into organization_workspaces (organization_id, workspace_id)
select o.id, w.id
from public.workspaces w
join organizations o on o.owner_id = w.owner_id and o.name = w.name
on conflict (workspace_id) do nothing;

insert into organization_members (organization_id, user_id, role)
select ow.organization_id, wm.user_id,
       case when wm.role = 'owner' then 'owner'
            when wm.role = 'admin' then 'admin'
            else 'member' end
from organization_workspaces ow
join public.workspace_members wm on wm.workspace_id = ow.workspace_id
on conflict (organization_id, user_id) do nothing;

insert into organization_permissions (organization_id, role, permission)
select o.id, r.role, p.permission
from organizations o
cross join (values ('owner'),('admin'),('security_admin'),('billing_admin'),('developer'),('analyst'),('member'),('viewer')) r(role)
cross join (values
  ('agents.manage'),('knowledge.manage'),('workflows.manage'),('approvals.manage'),
  ('channels.manage'),('api.manage'),('billing.manage'),('analytics.read'),
  ('audit.read'),('security.manage'),('members.manage'),('teams.manage')
) p(permission)
where not exists (
  select 1 from organization_permissions op
  where op.organization_id=o.id and op.role=r.role and op.permission=p.permission
);

alter table organizations enable row level security;
alter table organization_workspaces enable row level security;
alter table organization_members enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table organization_permissions enable row level security;

create policy "organization members can read organizations" on organizations for select using (
  exists (select 1 from organization_members om where om.organization_id=organizations.id and om.user_id=auth.uid())
);
create policy "organization admins can manage organizations" on organizations for all using (
  exists (select 1 from organization_members om where om.organization_id=organizations.id and om.user_id=auth.uid() and om.role in ('owner','admin'))
) with check (
  exists (select 1 from organization_members om where om.organization_id=organizations.id and om.user_id=auth.uid() and om.role in ('owner','admin'))
);
create policy "organization members can read workspaces" on organization_workspaces for select using (
  exists (select 1 from organization_members om where om.organization_id=organization_workspaces.organization_id and om.user_id=auth.uid())
);
create policy "organization admins manage workspaces" on organization_workspaces for all using (
  exists (select 1 from organization_members om where om.organization_id=organization_workspaces.organization_id and om.user_id=auth.uid() and om.role in ('owner','admin'))
) with check (
  exists (select 1 from organization_members om where om.organization_id=organization_workspaces.organization_id and om.user_id=auth.uid() and om.role in ('owner','admin'))
);
create policy "members can read organization membership" on organization_members for select using (
  exists (select 1 from organization_members me where me.organization_id=organization_members.organization_id and me.user_id=auth.uid())
);
create policy "admins manage organization membership" on organization_members for all using (
  exists (select 1 from organization_members me where me.organization_id=organization_members.organization_id and me.user_id=auth.uid() and me.role in ('owner','admin'))
) with check (
  exists (select 1 from organization_members me where me.organization_id=organization_members.organization_id and me.user_id=auth.uid() and me.role in ('owner','admin'))
);
create policy "org members can read teams" on teams for select using (
  exists (select 1 from organization_members om where om.organization_id=teams.organization_id and om.user_id=auth.uid())
);
create policy "org admins manage teams" on teams for all using (
  exists (select 1 from organization_members om where om.organization_id=teams.organization_id and om.user_id=auth.uid() and om.role in ('owner','admin'))
) with check (
  exists (select 1 from organization_members om where om.organization_id=teams.organization_id and om.user_id=auth.uid() and om.role in ('owner','admin'))
);
create policy "org members can read team membership" on team_members for select using (
  exists (select 1 from teams t join organization_members om on om.organization_id=t.organization_id where t.id=team_members.team_id and om.user_id=auth.uid())
);
create policy "team leads and org admins manage team membership" on team_members for all using (
  exists (
    select 1 from teams t join organization_members om on om.organization_id=t.organization_id
    where t.id=team_members.team_id and (om.user_id=auth.uid() and om.role in ('owner','admin') or exists (select 1 from team_members lead where lead.team_id=t.id and lead.user_id=auth.uid() and lead.role='lead'))
  )
) with check (
  exists (select 1 from teams t join organization_members om on om.organization_id=t.organization_id where t.id=team_members.team_id and om.user_id=auth.uid())
);
create policy "org members read permissions" on organization_permissions for select using (
  exists (select 1 from organization_members om where om.organization_id=organization_permissions.organization_id and om.user_id=auth.uid())
);
create policy "org admins manage permissions" on organization_permissions for all using (
  exists (select 1 from organization_members om where om.organization_id=organization_permissions.organization_id and om.user_id=auth.uid() and om.role in ('owner','admin','security_admin'))
) with check (
  exists (select 1 from organization_members om where om.organization_id=organization_permissions.organization_id and om.user_id=auth.uid() and om.role in ('owner','admin','security_admin'))
);

create index if not exists organization_members_user_idx on organization_members(user_id);
create index if not exists organization_workspaces_org_idx on organization_workspaces(organization_id);
create index if not exists teams_org_idx on teams(organization_id);
create index if not exists team_members_user_idx on team_members(user_id);
