# Disaster Recovery Runbook

## What's backed up, and how

**Primary: Supabase Point-in-Time Recovery (PITR).** This is the real
backup — continuous, covers every table, not just the three exported
weekly below. **Action required, not yet done here:** confirm PITR is
actually enabled on the production Supabase project (Project Settings →
Database → Point in Time Recovery). It's a paid-plan feature and is
**not on by default** — a project on the Free tier has no PITR at all,
only whatever manual/scheduled backups Supabase's base tier includes,
which is a materially different (weaker) guarantee. This runbook
assumes it's enabled; if it isn't, that's the single most important
gap to close before trusting any of the RPO/RTO targets below.

**Secondary: weekly JSON export** (`lib/backups/run.ts`, triggered via
`POST /api/backups/run`) — `bots`, `subscriptions`, and
`workspace_members` only, written to S3-compatible storage
**independent of the Supabase account**, per the spec's explicit
requirement. This exists for one specific scenario PITR doesn't cover:
**the Supabase account itself becomes inaccessible** (billing dispute,
account suspension, a Supabase-side incident affecting account access
rather than just the database) — a scenario where "restore from a
backup Supabase is holding" isn't an option at all. It is deliberately
NOT a substitute for PITR for ordinary "we broke something" recovery —
it's weekly (not continuous), and covers 3 tables, not the whole
database.

**Why these three tables and not everything:** they're the minimum to
reconstruct "who owns what, on what plan, with which bots" — account
and billing state. Knowledge chunks, conversations, and messages are
real data loss in the account-suspension scenario too, but are treated
as having a lower recovery priority than billing/ownership state for
this specific fallback path. See the comment in `lib/backups/document.ts`
for the same reasoning in code.

## RPO / RTO

| Scenario | Recovery Point Objective | Recovery Time Objective |
|---|---|---|
| Ordinary data loss/corruption (PITR) | Down to the minute/second, within your plan's retention window | Verify against your specific Supabase plan's documented restore time — this varies by database size and isn't a number to guess at in a runbook; check Supabase's current docs for your tier before treating any specific figure as reliable |
| Supabase account inaccessible (JSON export) | Up to 7 days (weekly export cadence) | Hours — manual reconstruction via the JSON export + a fresh Supabase project, not an automated restore path |

The JSON export's 7-day RPO is a real, accepted gap for account/billing
state specifically — not knowledge base or conversation data, which
this export doesn't cover at all. If that gap is too wide once real
paying customers exist, the fix is a shorter export interval, not a
different mechanism.

## Who

Whoever holds the Supabase project owner/admin role is responsible for
confirming PITR is enabled and for initiating a PITR restore (it's a
dashboard action, not something this codebase can trigger
programmatically). The on-call engineer (however that's defined for
your team once one exists) is responsible for recognizing which
scenario applies — "restore from PITR" vs. "the Supabase account itself
is the problem" — since the two paths below are different.

## Restore steps: PITR (the normal case)

1. In the Supabase dashboard: Project Settings → Database → Backups →
   Point in Time Recovery.
2. Select the target timestamp.
3. Follow Supabase's own restore flow — this creates a new database
   state at that point; **read Supabase's current documentation before
   doing this in a real incident**, since the exact flow (in-place vs.
   new-project restore) is a Supabase product detail this runbook
   shouldn't try to duplicate and risk going stale on.
4. Once restored, verify: can a test account log in, does a known bot
   still exist, does `/api/health` report `ok`.

## Restore steps: JSON export (Supabase account inaccessible)

1. Retrieve the most recent `chatbo-backups/YYYY-MM-DD.json` object
   from the configured S3-compatible bucket.
2. Stand up a fresh Supabase project; run every migration in
   `supabase/migrations/` in order (0001 through the latest).
3. This part is **not automated** — there is no restore script, only
   the export. Reconstructing `bots`/`subscriptions`/`workspace_members`
   from the JSON into the new project is a manual `INSERT` job against
   the new schema. Worth building a real restore script before this
   path is ever actually needed for real, rather than writing one for
   the first time during an incident.
4. Every user will need to reset their password (a fresh Supabase
   project has no `auth.users` history to restore from this export —
   auth state isn't part of what's exported) and re-verify email.
5. Knowledge bases are gone and need re-ingesting from scratch — this
   export never covered them.

## Testing this runbook

Not yet done. The Phase 1.19 checklist in the main README is what
"testing this" looks like in practice — this runbook is unverified
until at least one person has actually walked through both restore
paths once, ideally against a throwaway project rather than for the
first time during a real incident.
