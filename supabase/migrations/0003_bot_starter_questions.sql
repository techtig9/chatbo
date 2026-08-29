-- chatbo.ai — bots.starter_questions (Phase 1.3)
-- The original schema stored welcome_message but never gave the
-- Claude-generated starter questions (from synthesize-bot.ts) anywhere
-- to live. Caught while wiring up bot creation.

alter table bots add column starter_questions text[] not null default '{}';
