-- chatbo.ai — MFA recovery codes + org-enforceable MFA (Phase 1.11)
--
-- Supabase Auth's built-in TOTP MFA has no native "recovery codes"
-- concept — this table implements that as a genuine custom feature,
-- not a stub. A recovery code doesn't let someone log in bypassing MFA
-- (Supabase's own verification only accepts a real TOTP code); instead
-- a valid recovery code authorizes deleting the user's lost MFA factor
-- via the admin API, after which they log in with just their password
-- and can re-enroll a new device. That's the safe version of "recovery"
-- that doesn't require fighting Supabase's own assurance-level system.

create table mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index idx_mfa_recovery_codes_user on mfa_recovery_codes(user_id);

alter table mfa_recovery_codes enable row level security;

create policy "users read own recovery codes" on mfa_recovery_codes
  for select using (user_id = auth.uid());

-- Workspace owners on Business plan can soft-require MFA for every
-- member — enforced as a feature lock in the dashboard layout, not a
-- hard account lockout.
alter table workspaces add column require_mfa boolean not null default false;
