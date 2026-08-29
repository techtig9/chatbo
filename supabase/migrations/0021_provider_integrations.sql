-- Phase 13: provider integration metadata
alter table public.channel_connections add column if not exists provider text;
alter table public.channel_connections add column if not exists provider_account_id text;
alter table public.channel_connections add column if not exists scopes text[] not null default '{}';
create index if not exists channel_connections_provider_idx on public.channel_connections(provider, provider_account_id);
