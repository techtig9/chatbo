-- chatbo.ai — playground conversation channel (Phase 1.5)
-- The original schema's conversations.channel check constraint had no
-- value for in-dashboard playground testing, only real customer-facing
-- channels. Playground messages still cost real Claude/Voyage spend, so
-- they get logged and credited the same as any other channel — they
-- just need their own label rather than being miscounted as 'widget'
-- traffic that never actually reached a real customer.

alter table conversations drop constraint conversations_channel_check;
alter table conversations add constraint conversations_channel_check
  check (channel in ('widget','share_link','api','playground','slack','whatsapp','teams'));
