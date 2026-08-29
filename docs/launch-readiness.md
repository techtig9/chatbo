# Launch Readiness Assessment

Written at the end of Phase 1.22, the last phase of the 22-phase build.
"All 22 phases built" and "ready for real customers" are different
claims — this document is the second one, and it's deliberately not as
clean as the first.

## How to read this

Four categories. The distinction that matters most is between the
second and third: things that need a *credential* (mechanical, fast,
no judgment required) versus things that need a *decision* (a human
actually has to think about a tradeoff this build correctly declined
to make unilaterally). Treating the second like the third wastes time;
treating the third like the second ships someone else's unexamined
default as if it were a considered choice.

## 1. Genuinely ready as-is

No further action needed before these are trustworthy in production:

- **Core architecture**: auth, RBAC, workspaces, the credit system, RAG
  retrieval with a real grounding/fallback gate, audit logging. All
  have real unit test coverage on the money/security-critical logic
  specifically (credit deduction, RBAC authorization, fallback-trigger
  decisions) — not just "the happy path was clicked once."
- **Security posture**: CSRF audited route-by-route (not assumed),
  Zod validation audited and two real gaps closed, security headers
  including a real CSP, Dependabot configured. See the Phase 1.17
  section for what was actually checked, not just asserted.
- **CI gate**: a PR that breaks a money-critical test (credit deduction,
  RBAC, fallback logic) cannot merge — this is enforced by
  `.github/workflows/ci.yml`, not a policy in a README someone has to
  remember to follow.
- **Idempotency where it matters**: knowledge re-ingestion, the
  concierge bot seed action, webhook delivery retries — all safe to run
  more than once, deliberately, because scheduled jobs and manual
  re-runs both need that property.

## 2. Needs a credential, not a decision

Mechanical. Follow `.env.example` and the relevant phase's README
section; none of these require judgment about how the product should
behave, they just need real values.

| What | Where documented |
|---|---|
| Supabase project + migrations run | `Run it locally` section |
| Anthropic + Voyage API keys | `.env.example` |
| Paddle account, webhook secret, price IDs | `.env.example` |
| Resend API key (email) | `.env.example` |
| Sentry DSN (error tracking) | `.env.example`, Phase 1.15 section |
| Upstash Redis (rate limiting, response cache) | `.env.example`, Phase 1.18 section |
| S3-compatible bucket for backups | `.env.example`, Phase 1.19 section |
| Inngest event/signing keys (scheduler) | `.env.example`, Phase 1.20 section |
| `VERCEL_TOKEN` for CI deploys | CI/CD setup section |
| `WEBHOOK_SIGNING_SECRET` (shared secret for manual-fallback routes) | `.env.example` |
| Run the concierge bot seed action once, set `CONCIERGE_BOT_ID` | Phase 1.20 section |
| **Confirm Supabase PITR is actually enabled** | `docs/disaster-recovery.md` — the single most important item in this entire table, since it's silently *off by default* on lower Supabase tiers |

## 3. Needs a human decision, not a credential

This build deliberately did not decide these. Each has a real tradeoff
on both sides; picking one unilaterally would have been overreach, not
thoroughness.

- **Next.js 14.2.x has an open security advisory.** Bumping to a patched
  version is a real upgrade with real risk of breaking changes across a
  build this size — not something to do reflexively in a final polish
  pass with no ability to test the result against real traffic.
  Dependabot (Phase 1.17) will surface this as a PR; a human needs to
  actually review and merge it.
- **Sentry's bundle-size cost on the widget** (documented in Phase
  1.18) — ship it as-is, scope it down to specific routes, or drop it
  from the widget bundle entirely. Real product tradeoff between
  observability and the widget's own "lightweight embed" pitch.
- **Whether to self-host fonts** (Phase 1.21) — CDN `<link>` tags work
  and keep the build itself free of a network dependency, but mean two
  runtime third-party requests on every page load. A privacy/build-
  robustness tradeoff, not a bug.
- **Paddle cancellation doesn't downgrade the plan immediately** —
  intentional gap, not a bug, but "when exactly should a canceled
  subscription actually lose access" is a real product policy decision
  (immediately? end of billing period? grace period?) this build didn't
  make up on its own.
- **Team invites only work for people who already have an account** —
  a real, known product gap (no invite-before-signup flow), not fixed
  because the fix needs a schema change (nullable `user_id` +
  an `invited_email` column) that's a genuine design decision about
  how pending invites should work, not a quick patch.
- **Org-enforced MFA is a persistent banner, not a hard lock** — the
  original spec called for enforcement; this build shipped the weaker
  version and documented the gap rather than quietly building the
  stronger one without flagging that the softer version was even a
  choice.
- **The weekly backup export has no restore *script*, only the export**
  (Phase 1.19) — reconstruction into a fresh project is currently a
  manual `INSERT` job. Worth automating before this is trusted for a
  real incident, but writing that script blind, with no real incident
  to design it against, risks building the wrong thing confidently.

## 4. Accepted architectural tradeoffs (not bugs, not undecided)

These were deliberate calls made *with* reasoning, not gaps —
listed here so "why does it work this way" has one place to look
instead of an archaeology project through git blame.

- Fixed-window (not sliding-window) rate limiting — fewer Redis round
  trips, in exchange for up to 2x the configured rate right at a window
  boundary. Fine against scripted abuse; not a hard cap.
  See `lib/chat/rate-limit.ts` for the exact tradeoff.
- Weekly (not continuous) backup export, covering 3 tables (not the
  whole database) — Supabase PITR is the real continuous backup; the
  export exists specifically for the scenario where the Supabase
  *account* itself, not just the database, becomes inaccessible.
  See `docs/disaster-recovery.md`.
- The concierge bot's workspace bypasses real Paddle billing (SQL-set
  Business plan, no real subscription) — it's an internal fixture, not
  a customer, so this is correct, not a shortcut. Documented so it
  doesn't look anomalous in a future billing reconciliation.
- Widget bundle weight vs. Sentry — see category 3 above; listed here
  too since "ship as-is" is itself a legitimate, already-functioning
  choice, not a placeholder waiting on a decision that blocks anything.

## Bottom line

Nothing in category 1 needs your attention before real traffic.
Category 2 is a checklist — mechanical, an afternoon with real
credentials in hand. Category 3 is where actual judgment is needed, and
each item there was left specifically because this build didn't have
the standing (or the missing context — real usage patterns, your
actual risk tolerance, your actual customers) to make that call for
you. Category 4 is documentation, not a to-do list.

The honest one-line summary: **the code is real and tested; the
decisions in category 3 are the actual remaining work before this is a
business, not a codebase.**
