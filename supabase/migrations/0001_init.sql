-- chatbo.ai — initial schema (Phase 1.1)
-- Apply in the Supabase SQL editor, or via `supabase db push` once you have
-- the CLI linked to your project.

create extension if not exists vector;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ============================================================
-- Tables
-- ============================================================

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique not null,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references users(id) not null,
  created_at timestamptz default now()
);

create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  role text not null default 'editor' check (role in ('owner','admin','editor','viewer')),
  invited_at timestamptz default now(),
  joined_at timestamptz,
  unique (workspace_id, user_id)
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  use_case text not null,
  system_prompt_template text not null,
  thumbnail text
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  plan text not null default 'free' check (plan in ('free','starter','pro','business')),
  status text not null default 'active',
  provider text default 'paddle',
  paddle_subscription_id text,
  paddle_customer_id text,
  credits_remaining int not null default 2500,
  renews_at timestamptz
);

create table bots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  created_by uuid references users(id) not null,
  name text not null,
  description text,
  use_case text not null check (use_case in ('customer_support','lead_gen','faq','internal_docs','sales_assistant')),
  tone text not null check (tone in ('professional','friendly','playful','formal','empathetic')),
  fallback_behavior text not null default 'apologize_contact' check (fallback_behavior in ('escalate_email','apologize_contact','say_dont_know')),
  system_prompt text not null,
  model text not null default 'claude-sonnet-5',
  avatar text,
  brand_color text,
  welcome_message text,
  widget_position text not null default 'bottom-right' check (widget_position in ('bottom-right','bottom-left')),
  allowed_domains text[] default null,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz default now()
);

create table knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references bots(id) on delete cascade not null,
  type text not null check (type in ('file','text','url')),
  title text not null,
  storage_path text,
  raw_text text,
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  auto_resync boolean not null default false,
  created_at timestamptz default now()
);

create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references knowledge_sources(id) on delete cascade not null,
  bot_id uuid references bots(id) on delete cascade not null,
  content text not null,
  embedding vector(1024),
  content_hash text not null,
  chunk_index int not null default 0,
  created_at timestamptz default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references bots(id) on delete cascade not null,
  visitor_id text not null,
  channel text not null default 'widget' check (channel in ('widget','share_link','api','slack','whatsapp','teams')),
  started_at timestamptz default now(),
  ended_at timestamptz
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb,
  feedback text check (feedback in ('up','down')),
  created_at timestamptz default now()
);

create table integrations (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references bots(id) on delete cascade not null,
  channel text not null check (channel in ('slack','whatsapp','teams','zendesk')),
  status text not null default 'queued' check (status in ('queued','connected')),
  created_at timestamptz default now()
);

create table shares (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references bots(id) on delete cascade not null,
  slug text unique not null,
  is_public boolean not null default true,
  created_at timestamptz default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  paddle_transaction_id text,
  amount numeric,
  status text,
  created_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  actor_user_id uuid references users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  key_hash text not null,
  scopes text[] not null default '{read}',
  last_used_at timestamptz,
  created_at timestamptz default now(),
  revoked_at timestamptz
);

create table webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  url text not null,
  secret text not null,
  events text[] not null default '{conversation.started,message.created,feedback.submitted}',
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz default now()
);

create table webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_endpoint_id uuid references webhook_endpoints(id) on delete cascade not null,
  event text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','delivered','failed')),
  attempts int not null default 0,
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index idx_workspace_members_workspace on workspace_members(workspace_id);
create index idx_workspace_members_user on workspace_members(user_id);
create index idx_bots_workspace on bots(workspace_id);
create index idx_knowledge_sources_bot on knowledge_sources(bot_id);
create index idx_knowledge_chunks_bot on knowledge_chunks(bot_id);
create index idx_knowledge_chunks_source on knowledge_chunks(source_id);
-- ivfflat speeds up the top-k similarity search Phase 1.4 runs on every
-- chat message; lists=100 is a reasonable default up to ~1M chunks total,
-- revisit once you know real per-bot knowledge-base sizes.
create index idx_knowledge_chunks_embedding on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_conversations_bot on conversations(bot_id);
create index idx_messages_conversation on messages(conversation_id);
create index idx_audit_logs_workspace on audit_logs(workspace_id, created_at desc);
create index idx_api_keys_workspace on api_keys(workspace_id);
create index idx_notifications_user on notifications(user_id, read_at);

-- ============================================================
-- Row Level Security
--
-- Every table with a workspace_id (directly or via a bot_id join) is
-- locked to members of that workspace. Public, unauthenticated surfaces
-- (the widget, /chat/[slug]) never use this path — they go through the
-- service-role client after their own bot-level checks (allowed_domains,
-- rate limit), which is why bots/knowledge/conversations RLS below only
-- has to cover the *dashboard* access path, not the public chat path.
-- ============================================================

alter table users enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table subscriptions enable row level security;
alter table bots enable row level security;
alter table knowledge_sources enable row level security;
alter table knowledge_chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table integrations enable row level security;
alter table shares enable row level security;
alter table payments enable row level security;
alter table audit_logs enable row level security;
alter table api_keys enable row level security;
alter table webhook_endpoints enable row level security;
alter table webhook_deliveries enable row level security;
alter table notifications enable row level security;

-- Helper: is the current user a member of a given workspace?
create or replace function is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create policy "users read own row" on users
  for select using (id = auth.uid());
create policy "users update own row" on users
  for update using (id = auth.uid());

create policy "members read their workspaces" on workspaces
  for select using (is_workspace_member(id));
create policy "owner updates workspace" on workspaces
  for update using (owner_id = auth.uid());

create policy "members read workspace membership" on workspace_members
  for select using (is_workspace_member(workspace_id));

create policy "members read workspace subscription" on subscriptions
  for select using (is_workspace_member(workspace_id));

create policy "members read workspace bots" on bots
  for select using (is_workspace_member(workspace_id));
create policy "editors+ write workspace bots" on bots
  for all using (
    exists (
      select 1 from workspace_members
      where workspace_id = bots.workspace_id
        and user_id = auth.uid()
        and role in ('owner','admin','editor')
    )
  );

create policy "members read knowledge sources" on knowledge_sources
  for select using (
    exists (select 1 from bots where bots.id = knowledge_sources.bot_id and is_workspace_member(bots.workspace_id))
  );

create policy "members read knowledge chunks" on knowledge_chunks
  for select using (
    exists (select 1 from bots where bots.id = knowledge_chunks.bot_id and is_workspace_member(bots.workspace_id))
  );

create policy "members read conversations" on conversations
  for select using (
    exists (select 1 from bots where bots.id = conversations.bot_id and is_workspace_member(bots.workspace_id))
  );

create policy "members read messages" on messages
  for select using (
    exists (
      select 1 from conversations
      join bots on bots.id = conversations.bot_id
      where conversations.id = messages.conversation_id
        and is_workspace_member(bots.workspace_id)
    )
  );

create policy "members read integrations" on integrations
  for select using (
    exists (select 1 from bots where bots.id = integrations.bot_id and is_workspace_member(bots.workspace_id))
  );

create policy "members read shares" on shares
  for select using (
    exists (select 1 from bots where bots.id = shares.bot_id and is_workspace_member(bots.workspace_id))
  );

create policy "members read payments" on payments
  for select using (is_workspace_member(workspace_id));

create policy "admins read audit logs" on audit_logs
  for select using (
    exists (
      select 1 from workspace_members
      where workspace_id = audit_logs.workspace_id
        and user_id = auth.uid()
        and role in ('owner','admin')
    )
  );

create policy "admins manage api keys" on api_keys
  for all using (
    exists (
      select 1 from workspace_members
      where workspace_id = api_keys.workspace_id
        and user_id = auth.uid()
        and role in ('owner','admin')
    )
  );

create policy "admins manage webhook endpoints" on webhook_endpoints
  for all using (
    exists (
      select 1 from workspace_members
      where workspace_id = webhook_endpoints.workspace_id
        and user_id = auth.uid()
        and role in ('owner','admin')
    )
  );

create policy "members read webhook deliveries" on webhook_deliveries
  for select using (
    exists (
      select 1 from webhook_endpoints
      where webhook_endpoints.id = webhook_deliveries.webhook_endpoint_id
        and is_workspace_member(webhook_endpoints.workspace_id)
    )
  );

create policy "users read own notifications" on notifications
  for select using (user_id = auth.uid());
create policy "users update own notifications" on notifications
  for update using (user_id = auth.uid());

-- ============================================================
-- New-user bootstrap: mirror auth.users into public.users, create a
-- personal workspace, and seed a Free subscription — Phase 1.1's
-- "signup works end to end" requirement depends on this trigger.
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');

  insert into public.workspaces (name, owner_id)
  values (coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)) || '''s workspace', new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, joined_at)
  values (new_workspace_id, new.id, 'owner', now());

  insert into public.subscriptions (workspace_id, plan, credits_remaining)
  values (new_workspace_id, 'free', 2500);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
