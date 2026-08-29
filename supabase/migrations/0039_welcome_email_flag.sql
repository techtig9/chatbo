-- chatbo.ai — welcome email send-once guard (Phase 2 Resend coverage gap)
-- "welcome" is one of the required transactional email types (see
-- lib/email/templates.ts's welcomeEmail), sent from the auth callback route
-- on a user's first authenticated visit. Without a persisted flag, the
-- callback route (which runs on every magic-link/OAuth/email-confirmation
-- redirect, not just the first one) would have no reliable way to tell
-- "first ever session" from "logging in again" and would resend the
-- welcome email on every login.
alter table users add column if not exists welcome_email_sent_at timestamptz;
