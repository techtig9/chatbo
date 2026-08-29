-- Phase 27: secure SaaS integration connections, OAuth state, agent access and webhooks.
create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  status text not null default 'pending' check (status in ('pending','connected','error','disconnected')),
  account_id text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  expires_at timestamptz,
  scopes jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_used_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, provider)
);

create table if not exists public.integration_oauth_states (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  state_hash text not null unique,
  redirect_uri text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_integration_permissions (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  enabled boolean not null default true,
  scopes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bot_id, connection_id)
);

create table if not exists public.integration_webhooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid references public.integration_connections(id) on delete cascade,
  provider text not null,
  event_type text not null,
  endpoint_path text not null unique,
  secret_hash text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_action_catalog (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  action_key text not null,
  name text not null,
  description text not null,
  permission text not null check (permission in ('read','write','sensitive')),
  input_schema jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  unique(provider, action_key)
);

create index if not exists integration_connections_workspace_idx on public.integration_connections(workspace_id, updated_at desc);
create index if not exists integration_oauth_states_expiry_idx on public.integration_oauth_states(expires_at);
create index if not exists agent_integration_permissions_bot_idx on public.agent_integration_permissions(bot_id);
create index if not exists integration_webhooks_workspace_idx on public.integration_webhooks(workspace_id, provider);

alter table public.integration_connections enable row level security;
alter table public.integration_oauth_states enable row level security;
alter table public.agent_integration_permissions enable row level security;
alter table public.integration_webhooks enable row level security;
alter table public.integration_action_catalog enable row level security;

-- Catalog is readable by authenticated users; secrets/tokens are never in the catalog.
drop policy if exists integration_action_catalog_read on public.integration_action_catalog;
create policy integration_action_catalog_read on public.integration_action_catalog for select using (auth.uid() is not null);

-- Workspace-scoped records are readable/writable only by workspace members.
drop policy if exists integration_connections_member on public.integration_connections;
create policy integration_connections_member on public.integration_connections for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists integration_oauth_states_member on public.integration_oauth_states;
create policy integration_oauth_states_member on public.integration_oauth_states for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists integration_webhooks_member on public.integration_webhooks;
create policy integration_webhooks_member on public.integration_webhooks for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

drop policy if exists agent_integration_permissions_member on public.agent_integration_permissions;
create policy agent_integration_permissions_member on public.agent_integration_permissions for all using (
  exists (select 1 from public.bots b where b.id = bot_id and is_workspace_member(b.workspace_id))
) with check (
  exists (select 1 from public.bots b where b.id = bot_id and is_workspace_member(b.workspace_id))
);

insert into public.integration_action_catalog(provider,action_key,name,description,permission,input_schema) values
('slack','send_message','Send Slack message','Send a message to an authorized Slack channel.','write','{"type":"object","properties":{"channel":{"type":"string"},"text":{"type":"string"}},"required":["channel","text"]}'),
('shopify','get_order','Get Shopify order','Retrieve an order from the connected store.','read','{"type":"object","properties":{"order_id":{"type":"string"}},"required":["order_id"]}'),
('stripe','get_customer','Get Stripe customer','Retrieve a customer from the connected Stripe account.','read','{"type":"object","properties":{"customer_id":{"type":"string"}},"required":["customer_id"]}'),
('hubspot','find_contact','Find HubSpot contact','Search contacts in the connected CRM.','read','{"type":"object","properties":{"email":{"type":"string"}},"required":["email"]}'),
('zendesk','create_ticket','Create Zendesk ticket','Create a support ticket in the connected helpdesk.','write','{"type":"object","properties":{"subject":{"type":"string"},"description":{"type":"string"}},"required":["subject","description"]}')
on conflict(provider,action_key) do nothing;
