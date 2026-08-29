# chatbo.ai

Build status: **Phase 1 complete in this iteration** — full MVP (1.1–1.9) +
Workspaces/RBAC (1.10) + MFA (1.11) + Audit Logs (1.12) + Public API &
Outbound Webhooks (1.13) + Notifications (1.14) + Observability (1.15)
+ CI/CD (1.16) + Security Hardening (1.17) + Performance, Caching &
Accessibility (1.18) + Backups & Disaster Recovery (1.19) + Concierge
Bot (1.20) + Brand & Design System Implementation (1.21) + Final Polish
& Launch Readiness (1.22).

**Phase 1 focus:** professional AI-agent positioning, description-first creation, and a production-style SaaS landing/dashboard experience. The existing backend capabilities remain in place for the next phases. Read
[`docs/launch-readiness.md`](docs/launch-readiness.md) before
believing either — it's an honest breakdown of what's genuinely
production-ready, what just needs a credential, and what needs a real
human decision this build correctly declined to make on its own.

### Phase 1 changes in this package

- Repositioned chatbo.ai from a basic chatbot builder to a broader AI-agent platform.
- Rebuilt the public landing page with professional navigation, hero, use cases, workflow, features, CTA, and footer sections.
- Changed agent creation to a description-first experience while preserving structured use-case, tone, and fallback controls.
- Refreshed the agent dashboard/listing and empty state around an agent lifecycle: describe → generate → connect → test → publish.
- Updated product metadata and dashboard navigation to use AI-agent terminology.
- Cleaned the duplicate `inngest` dependency entry in `package.json`.

222 unit tests passing. `typecheck` / `lint` / `build` all green.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

### Getting the env values

1. **Supabase** — create a project at supabase.com, then Project Settings → API
   for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY`.
2. Open the SQL editor and run every file in `supabase/migrations/` in
   order (0001 through 0007) — table/RLS/trigger setup, credit
   functions, knowledge retrieval functions, playground channel, payment
   idempotency, and MFA.
3. In Supabase Auth settings: enable the **Google** provider if you want
   Google sign-in, and confirm **TOTP** is on under Multi-Factor Auth
   (usually on by default).
4. **Voyage AI** — `VOYAGE_API_KEY` from voyageai.com (knowledge base
   ingestion/retrieval).
5. **Anthropic** — `ANTHROPIC_API_KEY` from console.anthropic.com (bot
   generation and chat).
6. **Paddle** — `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, and `PADDLE_PRICE_ID_STARTER/PRO/BUSINESS`
   from a Paddle sandbox account, once you want to test billing.
7. **Sentry** — `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` (same value)
   from a Sentry project's settings. Optional `SENTRY_ORG`/`SENTRY_PROJECT`
   env vars enable source map upload on build if you also set a
   `SENTRY_AUTH_TOKEN`; without them the build just skips that step.
8. Resend/Upstash/Inngest aren't needed yet.

## Verifying it yourself

```bash
npm run typecheck   # tsc --noEmit
npm test             # vitest
npm run lint          # eslint
npm run build         # production build
```

All four are green as of this commit. `npm run build` will fail if a
route touches the session cookie (directly or transitively) but isn't
marked `export const dynamic = "force-dynamic"` — every route that needs
it already has it (this bit twice during development: once for the
`/dashboard` page in Phase 1.1, once for the audit-export Route Handler
in Phase 1.12 — same root cause both times, see Known Issues).

## What's real vs. not yet tested end-to-end

The code in this repo makes real calls to Supabase Auth, the Claude API,
Voyage AI, and Paddle — nothing is mocked. What hasn't been verified is
an actual live run (this sandbox can reach `api.anthropic.com` but not
`supabase.co`, `voyageai.com`, or `paddle.com`, and has no real API
keys). Before you trust this in production, walk through once yourself.

**Auth & workspace (1.1–1.2):**
- [ ] Sign up, confirm email, log in; log in with Google; log out;
      forgot/reset password
- [ ] Confirm a new signup gets a `workspaces` row, a `workspace_members`
      row with `role='owner'`, and a `subscriptions` row with 2,500
      credits (the `handle_new_user` trigger)
- [ ] Logged-out visit to `/dashboard` redirects to `/login`

**Bots & knowledge (1.3–1.4):**
- [ ] Create a bot via the wizard — confirm the generated system prompt
      enforces groundedness and matches the chosen tone
- [ ] Edit the system prompt in Monaco, save, reload — confirm it persisted
- [ ] Add a text knowledge source — confirm chunks land in
      `knowledge_chunks` with real embeddings and status goes
      `processing` → `ready`
- [ ] Add a URL source — confirm the fetched page's text chunked sensibly
- [ ] Add the exact same text to two different bots — confirm the second
      ingestion reuses cached embeddings (`chunksReusedFromCache`)
- [ ] Sanity-check `match_knowledge_chunks` similarity scores directly in
      the SQL editor

**Widget, playground & conversations (1.5–1.6):**
- [ ] Publish a bot, embed the widget-loader snippet on a static test
      page, confirm streaming + thumbs up/down feedback saves
- [ ] Visit the `/chat/[slug]` hosted page — same checks
- [ ] Embed on a domain NOT in `allowed_domains` — confirm 403 once set
- [ ] Send 21 messages/minute from one visitor — confirm the 21st 429s
- [ ] Export a conversation as CSV and JSON, confirm they match the UI

**Credits, billing & admin (1.7–1.9):**
- [ ] Confirm a platform admin (`users.role='admin'`) uses playground
      chat with genuinely zero credit deduction
- [ ] Complete a Paddle sandbox checkout — confirm the webhook updates
      `subscriptions` and logs a `payments` row
- [ ] Replay the same Paddle webhook event twice — confirm no duplicate
      `payments` row (migration 0006's unique constraint)
- [ ] Set a user to `role='admin'`, visit `/admin`, confirm all three
      sections load and a subscription override works; confirm a
      non-admin gets redirected away

**Workspaces & MFA (1.10–1.11):**
- [ ] Invite an existing account by email — confirm it shows "Pending"
      and does NOT grant access until accepted (a real bug I caught: the
      workspace-resolution query originally had no filter excluding
      unaccepted invites)
- [ ] Accept an invite as the invited user, switch between workspaces
      via the sidebar
- [ ] Confirm role/removal restrictions on the owner are enforced, and
      the seat limit blocks over-inviting
- [ ] Enroll MFA from Profile, save the recovery codes; log out and back
      in — confirm you land on `/mfa/verify`, not the dashboard
- [ ] Use `/mfa/recover` with a saved code — confirm the TOTP factor is
      removed and each code is single-use
- [ ] As a Business-plan owner, require MFA org-wide — confirm
      unenrolled members see the banner but aren't locked out (banner
      only, not a hard feature lock — see Known Issues)

**Audit logs (1.12):**
- [ ] Do a handful of actions and confirm each shows up in Settings →
      Activity with the right actor/action/target
- [ ] Filter by action, page through results, export CSV — confirm all
      three agree with each other
- [ ] Confirm only admin+ can reach `/dashboard/settings/activity`
- [ ] Delete a bot — confirm the confirm() dialog appears, canceling
      does nothing, and confirming cascades its knowledge base and
      conversations away

**Public API & webhooks (1.13):**
- [ ] Create an API key from Settings → API Keys (needs Pro+ plan) —
      confirm the plaintext key only ever appears once
- [ ] `curl` `/api/v1/bots` with `Authorization: Bearer <key>` — confirm
      it lists your bots; try with no header and a garbage key, confirm
      401 both times
- [ ] With a Pro (read-only) key, try `POST /api/v1/bots` — confirm 403;
      with a Business (read/write) key, confirm it works
- [ ] `POST /api/v1/bots/{id}/messages` — confirm you get a real reply
      and credits deduct by 10
- [ ] Create a webhook endpoint (Business plan) pointed at a real
      receiver (e.g. a webhook.site URL), select all three events, then
      trigger each from the widget/API — confirm signed deliveries
      arrive with a valid `X-Chatbo-Signature` header
- [ ] Point a webhook at an unreachable URL — confirm the delivery is
      marked `pending` (not silently dropped) and manually calling
      `/api/webhooks/process-pending` with the right bearer secret
      retries it
- [ ] Confirm playground testing does NOT trigger a configured webhook
      (this was a real bug I caught while wiring events: the first draft
      fired webhooks for playground traffic too)
- [ ] Visit `/developers` and `/openapi.json` while logged out — confirm
      both load instead of redirecting to login (another instance of the
      recurring "forgot to add a new public path to middleware" bug —
      see Known Issues)

**Notifications (1.14):**
- [ ] Set `RESEND_API_KEY`, then drive a workspace's credits down past
      80% and then 100% — confirm exactly one in-app notification and
      one email fire for each threshold, not one per message (check
      `subscriptions.notified_80_at`/`notified_100_at` get set)
- [ ] Confirm the notification bell shows a real unread badge, opening
      it lists real notifications, and mark-one/mark-all-read both work
- [ ] Invite an existing user (Settings → Members) — confirm they get
      both an in-app notification and an email
- [ ] Manually trigger a Paddle `transaction.payment_failed` test event
      — confirm the workspace owner gets notified
- [ ] Call `/api/notifications/send-weekly-digest` with the
      `WEBHOOK_SIGNING_SECRET` bearer token — confirm it emails owners
      of workspaces with real weekly activity and skips empty ones

**Observability & Monitoring (1.15):**
- [ ] Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`, trigger a real error
      in both a Server Component and a client component — confirm both
      show up in Sentry with a usable stack trace
- [ ] Confirm client-side errors actually reach Sentry's ingest domain —
      check the browser console/network tab isn't silently blocking the
      request via CSP (this was a real bug I caught while wiring this
      up: `connect-src` didn't originally allow Sentry's domain)
- [ ] Hit `/api/health` — confirm `200 {"status":"ok"}` when Supabase is
      reachable; disconnect/misconfigure Supabase and confirm it returns
      `503` instead of silently reporting healthy
- [ ] Call any `/api/v1/*` route and check the server logs — confirm a
      structured JSON line appears with request id, workspace id,
      latency, and outcome, and that the response includes an
      `X-Request-Id` header
- [ ] Compare Lighthouse/bundle-size numbers before and after this phase
      on `/widget/[botId]` specifically — see Known Issues below before
      deciding whether the current Sentry config is right for production

## CI/CD setup (Phase 1.16)

`.github/workflows/ci.yml` runs on every PR and on push to `main`:
`test` (lint, typecheck, unit tests, build — needs no secrets, every
route that touches env-dependent code is `force-dynamic` specifically
so build-time evaluation never happens) → `e2e` (Playwright smoke test,
needs real test-environment secrets, see `e2e/README.md`) →
`deploy-preview` (PRs) / `deploy-production` (`main`), both via Vercel
CLI.

**Repo secrets needed** (Settings → Secrets and variables → Actions):
- `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY`,
  `E2E_ANTHROPIC_API_KEY`, `E2E_VOYAGE_API_KEY` — point at a **dedicated
  test Supabase project**, never production; the e2e test creates and
  deletes real accounts
- `VERCEL_TOKEN` — for the two deploy jobs

Without the `E2E_*` secrets, the `e2e` job fails loudly rather than
skipping silently — see `e2e/README.md` for why that's the deliberate
choice. Without `VERCEL_TOKEN`, the deploy jobs fail, which is the
correct behavior until you've actually connected a Vercel project.

**Phase 1.16 checklist:**
- [ ] Push a branch that breaks a test in `lib/__tests__/rbac.test.ts`
      or `credits.test.ts` — confirm the `test` job fails and blocks
      merge (this is the concrete version of "a PR that breaks RBAC or
      credit deduction fails CI")
- [ ] Configure the `E2E_*` secrets against a real test Supabase
      project, push a PR, confirm the `e2e` job actually runs the full
      signup → bot → publish → widget journey and passes
- [ ] Confirm `npm run test:e2e` also works locally against
      `npm run dev` before trusting it in CI
- [ ] Configure `VERCEL_TOKEN` and confirm a PR gets a real preview
      deployment, and a merge to `main` deploys to production

## Security audit (Phase 1.17)

Systematic pass, not an assumption of coverage — here's what was
actually checked and what changed.

**CSRF.** Every `app/api/*` route was categorized by auth mechanism:
API-key/Bearer routes (`/api/v1/*`, both webhook processors) aren't
CSRF-relevant — browsers don't automatically attach Bearer tokens the
way they do cookies. Signature-verified routes (`/api/webhooks/paddle`)
aren't either — an attacker can't forge Paddle's HMAC. Public
unauthenticated routes (`/api/public/*`) have no ambient session to
abuse. Server Actions get Next.js's automatic Origin-header CSRF check
for free. That left exactly **one** real gap: `/api/dashboard/playground/[botId]`
— cookie-session-authenticated, state-changing (creates conversations,
spends credits), and a plain Route Handler rather than a Server Action,
so it never got the automatic protection. Fixed with an explicit
same-origin check (`lib/security/csrf.ts`, unit tested) as the very
first thing the handler does. `/api/dashboard/audit-export` is also
cookie-authenticated but deliberately did NOT get this check — it's a
read-only GET with no side effects, and enforcing an Origin check on it
would break normal direct-link/bookmark access without adding real
protection.

**Zod validation.** Audited every route and every server action.
Caught two real gaps:
- `lib/actions/shares.ts`'s `updateAllowedDomains` had a validation
  schema defined in `lib/validation/publish.ts` that was **never
  actually used** — dead code, silently doing nothing while the action
  itself just split the textarea on newlines with no format checking at
  all. Replaced with a real domain-format validator (rejects full URLs,
  paths, spaces, bad TLDs) and actually wired it in.
- `lib/actions/api-keys.ts`'s `createApiKey` had no length limit on the
  key name — not a security hole (no injection risk, it's parameterized),
  but genuinely unvalidated input the audit was supposed to catch.
  Given a proper schema.
- The Paddle webhook body was hand-typed as a TypeScript interface with
  optional chaining, not actually validated — the HMAC signature proves
  *authenticity*, not *shape*. Replaced with a real Zod schema so a
  malformed-but-authentically-signed payload gets a clean 400 instead of
  silently no-op-ing through optional-chained undefined checks.

**Dependabot.** `.github/dependabot.yml` — weekly, grouped by
UI-libs/dev-tooling to avoid PR spam, Next.js itself deliberately
ungrouped given the open advisory already tracked in Known Issues below.

**Security headers, secrets management.** Already covered in earlier
phases — CSP/HSTS/etc. from Phase 1.1, every secret read from `process.env`
with no hardcoded credentials anywhere in the repo (confirmed via grep,
not just assumed).

**Phase 1.17 checklist:**
- [ ] From a different origin (e.g. a local `python -m http.server` on
      a different port), try POSTing to `/api/dashboard/playground/[botId]`
      with a victim's session cookie — confirm 403, not a successful
      credit-spending request
- [ ] Try saving an allowed-domain entry like `https://evil.com` or
      `not a domain` in the Publish page — confirm it's rejected with a
      clear message instead of silently accepted
- [ ] Send the Paddle webhook a correctly-signed but malformed payload
      (missing required fields) — confirm a clean 400, not a crash or
      silent no-op
- [ ] Confirm Dependabot PRs actually start appearing in the repo's PR
      list after this is merged

## Performance, caching & accessibility (Phase 1.18)

**The headline finding from this phase: the product's own default brand
color failed accessibility contrast, and it was shipping to every bot
that hadn't customized it.** Building the WCAG contrast checker
(`lib/a11y/contrast.ts`) and testing it against known reference ratios
surfaced that `#1FA6A0` (the "signal" teal from the Brand & Design
System) measures **~2.99:1 contrast against white text — below WCAG's
3:1 floor even for large text**, let alone the 4.5:1 required for
normal-size text. That color was the *default* `accentColor` in both
`chat-ui.tsx` and `widget-loader.js` — the background behind the white
header text, user message bubbles, and send-button icon for every bot
that hadn't set a custom brand color. Fixed by changing the default
fallback to ink navy (`#12233A`, confirmed passing), and by wiring the
same contrast checker live into the bot editor's brand color field so a
customer picking their *own* failing color gets warned before they ship
it, not after. The `signal` color itself is untouched in
`tailwind.config.ts` — this was a default-value fix, not a rebrand;
whether the brand's teal should change is a real design decision for a
human to make, not something to do unilaterally while fixing a
contrast bug.

**Caching.** Rate limiting and response caching both moved to Upstash
Redis (`lib/cache/redis-client.ts`), with a graceful in-memory fallback
when Redis isn't configured — same interface either way, so nothing
downstream needed to change. The response cache keys on bot + question
+ a hash of the *retrieved context* (`lib/cache/response-cache-key.ts`),
which means a knowledge base edit invalidates stale cached answers
automatically, as a side effect of the key changing, not as a separate
cache-clear step that could be forgotten. Rate limiting uses a
fixed-window counter in Redis rather than a true sliding window — a
documented, deliberate tradeoff (up to 2x the configured rate right at
a window boundary) in exchange for meaningfully fewer round trips on a
hot path; the economics here don't depend on the limit being exact, just
blunt against scripted abuse.

**Edge caching.** `export const revalidate` (Next.js ISR) was tried
first for `/chat/[slug]` and `/widget/[botId]` — and turned out to do
nothing, because Supabase-JS's internal fetch calls don't participate
in Next's fetch cache the way that feature assumes. Rather than claim
caching that the build output contradicted, real `Cache-Control`
headers were added directly (`next.config.mjs`): `s-maxage=60,
stale-while-revalidate=300`. This is verifiable with `curl -I`, unlike
the ISR attempt. Fixing this also caught that `/widget` and `/chat` had
been shipping with **zero security headers at all** since Phase 1.1 —
excluded from the main CSP block (correctly, they need a different one
to be embeddable) but never given their own replacement.

**First-token latency.** Measured and logged per the spec's Definition
of Done (`logFirstTokenLatency` in `lib/observability/logger.ts`),
covering both cache hits and real generation, labeled by channel
(widget vs. playground). Caught a real bug in this code before
shipping it: the channel label was initially computed from `persist`,
but both the widget and playground callers pass `persist: true` — the
label would never have actually said "playground." Fixed to key off
`firesWebhooks` instead, the flag that actually distinguishes them.

**A11y beyond contrast.** The chat log uses `role="log"` with a
separate visually-hidden `aria-live="polite"` region that announces
once a reply *completes* — deliberately NOT live-announcing the
visible streaming text itself, since that updates per-token and would
otherwise flood a screen reader with repeated interruptions on every
character. Caught this while implementing it (first draft put
`aria-live` directly on the fast-mutating container) and rebuilt it
before it shipped as a "technically has aria-live but is actually a
worse experience than none" bug.

**Phase 1.18 checklist:**
- [ ] Set `UPSTASH_REDIS_REST_URL`/`TOKEN`, confirm rate limiting and
      response caching actually hit Redis (check the Upstash dashboard
      for command activity) instead of silently falling back to
      in-memory
- [ ] Ask a bot the same question twice — confirm the second reply is
      instant (`cacheHit: true` in the first-token latency log) and
      still deducts credits/fires webhooks identically to a real call
- [ ] Edit a bot's knowledge base, ask the same question again — confirm
      the cache does NOT serve the old answer (the context-hash-based
      key should have changed)
- [ ] `curl -I` a `/chat/[slug]` or `/widget/[botId]` URL — confirm
      `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
      and a real CSP are both present
- [ ] Set a bot's brand color to something pale/light in the editor —
      confirm the live contrast warning appears; leave it unset and
      confirm the widget renders with the ink-navy default, not the old
      failing teal
- [ ] Run Lighthouse accessibility against the dashboard and a
      published widget — confirm ≥95 (the spec's explicit target); if
      not, the gap is now easier to find given the contrast utility
      exists to check specific colors against
- [ ] Tab through the widget using only the keyboard — confirm the
      starter-question buttons, feedback thumbs, and send button are
      all reachable and visibly focused

## Backups & disaster recovery (Phase 1.19)

Full details: [`docs/disaster-recovery.md`](docs/disaster-recovery.md) —
the runbook itself, RPO/RTO targets, and the reasoning behind what is
and isn't covered.

**Two mechanisms, deliberately different in scope:**
1. **Supabase PITR** — the real backup, continuous, whole database.
   Nothing to build; a project setting to confirm is actually enabled
   (it's a paid-tier feature, not on by default).
2. **Weekly JSON export** (`lib/backups/run.ts` → `POST /api/backups/run`)
   — `bots`, `subscriptions`, `workspace_members` only, written to
   S3-compatible storage independent of the Supabase account, for the
   one scenario PITR can't cover: the Supabase account itself becoming
   inaccessible, not just the database having a problem.

**A real bug caught while wiring the trigger route, not a new one —
the exact same class hit repeatedly this session:** `/api/backups/run`
and `/api/notifications/send-weekly-digest` both authenticate via a
bearer secret, not a session cookie, since they're meant to be called
by an external scheduler with no chatbo.ai login at all. Neither was in
the middleware's public-path list. For the backups route this was
caught before ever shipping; for the digest route, this means **it has
been silently broken since Phase 1.14** — any external caller would
have been redirected to an HTML login page instead of ever reaching the
bearer-secret check, and nothing in that phase's own testing would have
caught it since I never actually called it as an unauthenticated
external caller would. Both are fixed now, in the same commit.

**Phase 1.19 checklist:**
- [ ] Confirm Point in Time Recovery is actually enabled on the
      production Supabase project — Project Settings → Database →
      Backups. This is the single most important item in this entire
      phase and the codebase cannot verify it for you.
- [ ] Set the `BACKUP_S3_*` env vars against a real S3-compatible
      bucket, call `POST /api/backups/run` with the
      `WEBHOOK_SIGNING_SECRET` bearer token, confirm a real
      `chatbo-backups/YYYY-MM-DD.json` object lands in the bucket with
      the right row counts
- [ ] Call `/api/notifications/send-weekly-digest` without a session
      cookie (e.g. via `curl`, not a logged-in browser) — confirm it now
      reaches the bearer-secret check instead of a login redirect
- [ ] Have someone who isn't you read `docs/disaster-recovery.md` cold
      and try to follow the PITR restore steps against a real Supabase
      project — a runbook only its author can follow isn't one
- [ ] Decide whether a real restore *script* (not just the export) is
      worth building before this is trusted for a real incident — the
      runbook is explicit that reconstruction is currently manual

## Concierge bot & scheduler (Phase 1.20)

This is the phase that finally resolves the "not wired to a scheduler
yet" gap threaded through Phases 1.13, 1.14, and 1.19 — real Inngest
functions now exist for webhook retries (every 15 min), the weekly
digest (Mondays), the weekly backup (Sundays), and the concierge bot's
own daily knowledge refresh (`lib/inngest/functions.ts`, served via
`app/api/inngest/route.ts`). Every manual `POST` route from those
earlier phases stays working too — kept deliberately as a real,
separately-callable fallback for forcing a run without waiting for the
schedule, not dead code.

**The concierge bot itself** (`lib/concierge/seed.ts`) is idempotent:
running the admin seed action creates the internal workspace, bot, and
knowledge source on first run, and just re-ingests `/help` on every
run after that — which is also the intended way to pick up edits to
the help center content immediately rather than waiting for the daily
cron. Its knowledge source is a real URL (`/help`), not static pasted
text, which is what makes a *scheduled* re-ingestion meaningful at
all — if the help page changes, the next scheduled run (or a manual
re-run of the seed action) picks it up automatically, the same way a
customer's own URL-type knowledge sources would.

**Four real bugs caught while building this phase**, each before
shipping:
1. `ingestKnowledgeSource` only ever inserted chunks — calling it twice
   on the same source (exactly what a scheduled re-ingestion does)
   would have duplicated every chunk on every refresh. Made idempotent,
   but the first fix attempt deleted old chunks *before* confirming the
   new content was even valid — a failed refresh would have blanked out
   a bot's knowledge base rather than left the old content in place.
   Reordered so the delete only happens after chunking and embedding
   have already succeeded.
2. The concierge re-ingestion Inngest function read
   `source.storage_path` for the URL to re-fetch — checked against the
   actual `addUrlSource` code and found the URL is stored in `title`,
   not `storage_path`. Would have silently skipped every source it was
   supposed to refresh, forever, with no error to notice.
3. The concierge seed action called `redirect()` on success *inside* a
   `try` block with a generic `catch` — since Next.js implements
   `redirect()` by throwing, the success path would have been caught
   and reported as a failure every single time it actually worked.
4. `/api/inngest` was missing from the middleware's public paths — the
   same recurring bug class hit repeatedly this session, caught this
   time before Inngest's own signed requests ever reached it, not
   after.

**Phase 1.20 checklist:**
- [ ] Run `npx inngest-cli dev` locally, confirm all four functions are
      discovered at `/api/inngest`, and manually trigger each from the
      Inngest dev UI to confirm they actually run (no cloud credentials
      needed for this — the dev server works standalone)
- [ ] Log in as a platform admin, visit Admin → System, run "Create /
      refresh concierge bot" — confirm the workspace, bot, and
      knowledge source all get created, and the response includes a
      real bot id
- [ ] Copy that bot id into `CONCIERGE_BOT_ID`, redeploy, confirm the
      "Ask chatbo" bubble appears in the dashboard and the widget
      appears on the homepage
- [ ] Ask the concierge bot "how do credits work" and "how do I embed
      my bot on Squarespace" — confirm correct, cited answers matching
      `app/help/page.tsx`'s actual content
- [ ] Ask it something genuinely out of scope (e.g. "what's your
      refund policy for a specific order") — confirm it asks for an
      email and escalates rather than guessing
- [ ] Edit `app/help/page.tsx`, redeploy, re-run the seed action —
      confirm the bot's answers reflect the edit
- [ ] Set `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` against a real
      Inngest Cloud app and confirm the scheduled crons actually fire
      on their real schedule, not just when manually triggered

## Brand & design system implementation (Phase 1.21)

**A real, useful discovery from this phase: `next/font/google` (the
normally-recommended way to load Google Fonts in Next.js) requires
network access to `fonts.googleapis.com` at BUILD TIME, not just at
runtime.** Tried it first for Newsreader and IBM Plex Mono — it failed
outright in this sandbox's restricted build environment, and would fail
identically in any CI pipeline that blocks external network access
during build steps, which locked-down corporate CI environments
routinely do. Switched to plain CDN `<link>` tags for all three fonts
instead (`app/layout.tsx`) — a real, deliberate trade: giving up
next/font's self-hosting (slightly better privacy, no runtime
third-party request) in exchange for a build that doesn't have a hard
dependency on a third-party API being reachable during the build
itself. If self-hosting the fonts matters for your deployment, that
means actually downloading the font files and using `next/font/local`
— this build didn't do that for you, and documents the gap rather than
leaving the `next/font/google` code in place looking like it works
when it was never actually verified to build.

**The logo mark** went through a real redesign mid-build, not a
one-shot creation: the first version included three "typing dot"
details inside the bubble and used `currentColor` for its fill. Once
actually placed in the concierge launcher button (which already used
`text-paper` for its own close icon), the dots became invisible —
`currentColor` meant the bubble and its supposedly-contrasting dots
inherited the *same* light color. Simplified to bubble + anchor only
(the dots were too much detail to read at 20-24px anyway) and switched
to explicit literal colors with an `variant="inverted"` option for dark
backgrounds, rather than relying on color inheritance from whatever
context happens to render it.

**Where the logo actually appears**, and where it deliberately
doesn't: favicon, dashboard sidebar, homepage, and the concierge
launcher (`components/branding/logo.tsx`) all use the real mark.
`widget-loader.js`'s bubble icon — the button that appears on a
*customer's own site* for *their* bot — deliberately stays a generic
chat icon, not chatbo.ai's mark. That widget represents the customer's
bot, not chatbo.ai itself; stamping our own logo on it would be like a
vendor's logo overriding a customer's own branding on their embedded
widget. Email templates stay text-based (styled wordmark, not an
embedded image) — a deliberate, common choice given how unreliably SVG
renders across email clients.

**The hero demo** (`components/marketing/hero-demo.tsx`) is a real,
looping CSS animation — no JavaScript timers, no video file, matching
the Definition of Done's "not a video loop" requirement literally. One
shared 9-second cycle via `animation-delay` staggering across question
bubble → source chips → SVG line-draw (using `pathLength={1}` so the
dash-offset math doesn't depend on actual path geometry) → answer →
citation. A real accessibility gap was caught and fixed while building
this: the existing global `prefers-reduced-motion` rule already forced
`animation-duration` and `animation-iteration-count` to near-zero/one,
but not `animation-delay` — meaning a staggered multi-element sequence
would have still revealed itself over several real seconds even under
"reduced motion," which isn't disabling the animation, just slowing its
appearance. Fixed by adding `animation-delay: 0s !important` to that
same global rule. The keyframes themselves are deliberately designed so
the fully-revealed, readable state sits in the back half of the cycle
(55-100%) with `animation-fill-mode: forwards` — under reduced motion,
every element races to its 100% keyframe and holds there, so a
reduced-motion user sees the complete answer immediately, not a blank
or half-drawn state.

**Phase 1.21 checklist:**
- [ ] Load the homepage and actually watch a full 9-second cycle —
      confirm question → chips → connecting lines draw → answer →
      citation appear in that order and the loop restart isn't jarring
- [ ] Enable "reduce motion" in your OS accessibility settings, reload
      the homepage — confirm the demo shows the complete, fully-revealed
      state immediately with no staggered reveal and no animation
- [ ] Confirm all three fonts (General Sans on headings/UI, Newsreader
      on body copy, IBM Plex Mono on code/credit numbers) actually load
      — check the Network tab for the two CDN CSS requests succeeding
- [ ] Run Lighthouse against the homepage specifically — confirm
      performance stays ≥90 despite the animation (unverified here, no
      browser in this sandbox to run Lighthouse in)
- [ ] Decide whether self-hosting the fonts (downloading the files,
      switching to `next/font/local`) is worth doing for your actual
      deployment's privacy requirements — this build deliberately didn't
      make that call for you

## Final polish & launch readiness (Phase 1.22)

Full details: [`docs/launch-readiness.md`](docs/launch-readiness.md) —
a four-category honest breakdown of what's genuinely production-ready,
what just needs a credential, what needs an actual human decision this
build correctly declined to make, and what's a deliberate architectural
tradeoff rather than a gap.

**What actually got fixed this phase**, found through a systematic
sweep rather than a re-read of the code hoping to spot something:

- **Two "Known issues" entries were stale and actively wrong** — both
  claimed the webhook retry and weekly digest had no scheduler, but
  Phase 1.20 resolved both with real Inngest cron functions weeks
  before this sentence would have been read by anyone. Corrected.
  A wrong "known limitation" is worse than an accurate one — it costs
  someone time verifying a problem that doesn't exist.
- **The email templates still used the brand teal that Phase 1.18 proved
  fails WCAG contrast** (documented then, deliberately left unfixed
  since the widget default was the more urgent fix at the time). Fixed
  now with a same-hue darker shade (`#136B62`, 6.35:1 vs. the original
  2.99:1).
- **The e2e test had no real safety guard against running against
  production**, just a README warning. Added a required
  `E2E_CONFIRM_NOT_PRODUCTION` env var the test refuses to run
  without — honestly scoped: it doesn't verify anything technically, it
  forces a conscious decision instead of a silent default.
- **Structured logging extended** to the three scheduled-job fallback
  routes (webhook retry, backup, digest) — where a real log line
  matters most, since these are exactly what you'd check first when a
  cron job silently fails.
- **A systematic `.env.example` audit**, cross-checking every
  `process.env.X` actually used in code against what's documented, in
  both directions. Found `SENTRY_ORG`/`SENTRY_PROJECT` used but
  undocumented, and `PADDLE_API_KEY` documented but never referenced
  anywhere — genuinely dead config that would have confused a real
  deployer into thinking it did something. Fixed both directions.
- **The build output itself had two real deprecation warnings and an
  "ACTION REQUIRED" notice from `@sentry/nextjs`** — `disableLogger`
  and `automaticVercelMonitors` had moved under a new `webpack.*`
  config shape, and Sentry's client-side navigation instrumentation
  needed an explicit `onRouterTransitionStart` export that was never
  added. All three were sitting in plain sight in every build log since
  Phase 1.15 — a clean exit code doesn't mean an empty build log, and
  this phase's whole premise is checking rather than assuming, so
  reading the actual output caught what `tsc --noEmit` passing silently
  didn't. Fixed; confirmed with a clean rebuild showing zero warnings.

**What this phase deliberately did NOT do**: bump Next.js past its
open advisory, decide the Sentry-bundle-weight tradeoff, build the
invite-before-signup flow, or write a backup restore script blind. Each
of these is in `docs/launch-readiness.md`'s category 3 — a real
decision, not a quick patch, and rushing one in a final polish pass
would trade the appearance of completeness for actually-considered
judgment. See that document for the reasoning on each.

**Phase 1.22 checklist:**
- [ ] Read `docs/launch-readiness.md` in full before considering this
      "done" — it's the actual point of this phase, not a formality
- [ ] Work through category 2 (credentials) — mechanical, should take
      an afternoon with real accounts in hand
- [ ] For each item in category 3, make the actual decision — don't
      let "documented as undecided" quietly become "decided by
      default" through inaction
- [ ] Re-run the full verification suite (`npm run typecheck && npm
      test && npm run lint && npm run build`) after configuring real
      credentials, not just in this credential-free sandbox — several
      code paths (Sentry, Resend, Paddle, Redis, S3, Inngest) have only
      ever been typechecked and reasoned about here, never executed
      against a real backing service
- [ ] Run a real Lighthouse pass against the homepage and widget —
      asserted as a design goal throughout, never actually measured in
      this environment

## Known issues

- **Next.js 14.2.x has an open advisory** ("Unauthenticated disclosure of
  internal Server Function endpoints") with no non-breaking fix yet — the
  patched version is Next 16, outside this build's pinned stack. Pinned
  to the latest 14.2.x patch (14.2.35).
- `next`'s bundled build tooling pulls in a transitively vulnerable
  `postcss@8.4.31`; this app's own `postcss` is pinned to a patched
  `8.4.47` — the vulnerable copy is internal to Next's pipeline.
- File-upload knowledge sources (PDF/DOCX) aren't built — only pasted
  text and single-URL ingestion.
- `SIMILARITY_THRESHOLD = 0.5` is a starting guess, not tuned against
  real data.
- The public chat rate limiter and the MFA-recovery rate limiter are
  both in-memory, not Redis — won't coordinate across multiple
  serverless instances. Phase 1.18 replaces the backend.
- "Most-asked questions" groups by exact text match, not semantic
  similarity.
- Groundedness on a no-context turn is enforced by an explicit runtime
  instruction to the model, not a hard code-level block on generation.
- **Paddle cancellation doesn't downgrade the plan immediately** — it
  only records `status='canceled'`. Actual downgrade-at-period-end needs
  a scheduled job (Phase 1.13/1.20's Inngest queue) checking
  `renews_at`, which doesn't exist yet.
- Admin subscription overrides and the billing page don't specially
  handle a Paddle `past_due`/`paused` status — displayed as-is.
- **Invites only work for people who already have a chatbo.ai account** —
  the schema requires a real `user_id`, and email delivery isn't built
  (Phase 1.14). A real "invite before signup" flow needs a schema change
  plus Resend.
- Ownership transfer isn't implemented — the owner role can't be changed
  or removed via Settings, by design, until a dedicated flow exists.
- **Org-enforced MFA is a banner, not a hard feature lock** — the spec
  asked for both; blocking specific mutating actions for unenrolled
  members needs threading an MFA check through every RBAC-gated action,
  not just the dashboard shell.
- MFA recovery codes are a custom feature (Supabase has no native
  concept) — a code authorizes deleting the lost TOTP factor via the
  admin API, it does not bypass login directly. Easy to mistake for a
  backup password; it isn't one.
- Audit log `metadata` is untyped JSON per action — fine for a human
  reading the Activity tab, would need a schema before anything parses
  it programmatically.
- The audit CSV export streams full unpaginated history in one response
  — fine now, revisit if a workspace's history gets large.
- **A route that touches the session cookie but throws on missing env
  vars before Next's static analysis sees that dependency gets
  incorrectly prerendered at build time.** Hit this three times now: the
  `/dashboard` page (1.1), the audit-export Route Handler (1.12), and
  proactively avoided in every new v1 API route (1.13) by adding
  `force-dynamic` up front. Every new authenticated Route Handler gets
  this by default now rather than waiting to hit the bug a fourth time.
- **Middleware needs every new public path added explicitly, and this
  keeps getting missed on the first pass.** Hit it for
  `widget-loader.js` (1.5), then for `openapi.json`/`/developers` and —
  more seriously — the entire `/api/v1/*` surface (1.13): without adding
  it, every external API caller with no chatbo.ai session would have
  been redirected to an HTML login page instead of ever reaching the
  API-key auth logic, which would look completely fine in any test done
  as a logged-in user and only break for real third-party callers.
- ~~Outbound webhook delivery has no real queue~~ — **resolved in Phase
  1.20.** `retryPendingWebhookDeliveries` (`lib/inngest/functions.ts`)
  runs every 15 minutes via real Inngest scheduling. `triggerWebhookEvent`
  still attempts delivery inline first (deliberately — no `waitUntil()`-
  style background task support in this codebase, so fire-and-forget
  risks the function freezing mid-delivery), and
  `/api/webhooks/process-pending` still exists as a manual fallback for
  forcing a retry pass without waiting for the schedule.
- Deleting a webhook endpoint doesn't clean up its `webhook_deliveries`
  rows (no cascade set on that FK) — harmless (they're just orphaned
  history), but worth a cleanup pass eventually.
- ~~The weekly digest has no scheduler either~~ — **also resolved in
  Phase 1.20.** `sendWeeklyDigest` runs every Monday via real Inngest
  scheduling; `/api/notifications/send-weekly-digest` stays as the
  manual fallback.
- Digest `creditsUsed` is an approximation (`messageCount * 10`), not a
  ledger of actual deductions — ingestion and API-request credit costs
  aren't broken out separately in the query. Fine for a "here's roughly
  what happened" summary email, not something to build billing logic on.
- Low-credit and payment-failure notifications only ever reach the
  workspace *owner*, never admins — a deliberate scope decision (owner
  is who `billing:manage` is gated to), but worth revisiting if
  multi-admin workspaces want billing visibility spread wider.
- **Sentry adds real, non-trivial bundle weight — this needs a decision,
  not just an acceptance.** Middleware more than doubled (54.8kB →
  118kB) and the widget's first-load JS grew from ~90kB to ~164kB. For
  a product whose pitch includes "one lightweight embeddable widget,"
  shipping the full Sentry browser SDK into that same bundle is a real
  tradeoff. Worth investigating before launch: a lighter/tree-shaken
  Sentry config for just the `/widget` and `/chat/[slug]` routes,
  lowering `tracesSampleRate` further, or accepting the cost because
  error visibility on the actual customer-facing surface matters more
  than a few hundred KB. Not decided here — flagged for a real choice.
- **Structured request logging covers `/api/v1/*` and the three
  scheduled-job fallback routes** (webhook retry, backup, digest —
  extended in Phase 1.22, since a failed cron job's manual-retry fallback
  is exactly where a real log line matters most). Still not covered:
  the playground route and audit-export. `withRequestLogging` is generic
  and reusable, so finishing the remaining routes is mechanical, just
  not done — deprioritized since neither is a scheduled job or a
  customer-facing production traffic path.
- `/api/health` checks Supabase connectivity only — it doesn't verify
  Anthropic, Voyage, or Paddle are reachable. A "the app is up but every
  AI call is failing" state would currently report healthy.
- ~~The e2e smoke test creates real accounts against whatever Supabase
  project its env vars point at, with nothing enforcing "never
  production"~~ — **addressed in Phase 1.22.** `getAdminClient()` now
  refuses to run at all unless `E2E_CONFIRM_NOT_PRODUCTION=true` is
  explicitly set. Honest caveat: this doesn't *verify* anything — it
  can't know what your production URL looks like — it just forces a
  conscious, deliberately-unusual-named opt-in instead of running
  silently against whatever `NEXT_PUBLIC_SUPABASE_URL` happens to
  resolve to. Real protection still depends on that opt-in decision
  being made correctly, same as before; this makes it a deliberate
  choice instead of a default.
- The e2e test's assertions after the widget round trip are functional
  proxies (input re-enables, no error banner) rather than checking
  specific message content, since there's no stable `data-testid` on
  the chat bubbles yet — fine for a smoke test, would need real test IDs
  for anything more precise.
- Preview/production deploy jobs are written against the Vercel CLI but
  completely unverified — no `VERCEL_TOKEN` exists to test against here.
- **Admin actions (`lib/actions/admin.ts`) validate manually rather than
  via Zod** — `overrideSubscription` checks plan enum membership and
  numeric validity by hand instead of a schema object. Functionally
  equivalent, genuinely validated, just a style inconsistency the audit
  noted rather than a real gap — left as-is rather than rewriting for
  consistency's own sake.
- The domain-format regex in `parseAllowedDomains` doesn't support
  internationalized domain names (IDN/punycode) — a real business with
  a non-ASCII domain would need to enter its punycode form. Edge case,
  not fixed here.
- CSRF protection for the playground route checks Origin against Host —
  standard, but if this app ever sits behind a proxy that rewrites Host
  inconsistently, that check could false-positive-reject legitimate
  requests. Worth revisiting if that ever comes up in a real deploy.
- **The email templates (`lib/email/templates.ts`) still use the
  failing signal teal as link-text color** on a white background — the
  same 2.99:1 ratio (contrast is symmetric, so teal-as-text-on-white
  fails the same way teal-as-background-behind-white-text does).
  Lower severity than the widget default (short underlined links read
  better at poor contrast than solid blocks of body text, and it's not
  the interactive product surface), but genuinely not fixed — flagged
  honestly rather than silently left inconsistent with the widget fix.
- The Redis-backed rate limiter uses a fixed-window counter, not a true
  sliding window — documented tradeoff, see the Phase 1.18 section
  above, not a bug.
- No Lighthouse run has actually happened against this build — the ≥95
  accessibility target is the spec's requirement and the tooling to
  check specific colors now exists, but the number itself is unverified
  here.
- First-token latency is logged per-line but nothing aggregates it into
  an actual p95 yet — that's the job of whatever log platform ingests
  these JSON lines (Vercel Logs, Datadog, etc.), not something this
  codebase computes itself.
- **The weekly export has no restore script, only the export itself** —
  `docs/disaster-recovery.md` is explicit that reconstructing the three
  tables into a fresh Supabase project is currently a manual `INSERT`
  job. Worth building the actual restore script before this path is
  ever needed for real.
- The JSON export doesn't cover `auth.users` (Supabase manages that
  separately) — a restore via this path means every user resets their
  password from scratch. Documented in the runbook, not silently
  assumed away.
- RPO/RTO figures for PITR itself are deliberately left as "verify
  against your plan's docs" rather than a specific number — stating a
  precise restore time here without checking Supabase's current,
  plan-specific documentation would be a guess dressed up as a fact in
  a document people might trust during a real incident.
- **The concierge workspace bypasses the normal Paddle billing flow
  entirely** — `seedConciergeBot` sets its subscription to Business
  plan with 31,000 credits directly via SQL, not through a real Paddle
  checkout. Deliberate (it's an internal fixture, not a paying
  customer), but means it never gets a `paddle_subscription_id` and
  would look anomalous in any Paddle-reconciliation report.
- The concierge bot's credits deduct like any other bot's — real
  traffic to it costs real money, same economics as a customer bot on
  Business plan. No special "internal traffic is free" carve-out exists
  in the credit-spending code, and none was added — simplicity over
  optimizing a cost that's expected to be small.
- Inngest cron schedules (15 min / daily / weekly) are reasonable
  defaults, not load-tested or validated against real traffic patterns —
  worth revisiting once real usage exists, especially the 15-minute
  webhook retry interval if delivery volume ever gets large.
- The homepage's concierge widget is baked in at build time (static
  prerendering) — setting `CONCIERGE_BOT_ID` for the first time needs a
  redeploy to actually appear there, not just an env var change on a
  running instance. Documented in the code comment, not silently
  assumed obvious.
- **Fonts load from two third-party CDNs at runtime** (Google Fonts,
  Fontshare) — a deliberate trade-off made this phase to keep the build
  itself free of a hard network dependency (see the Phase 1.21 section
  above), but it does mean every real page load makes two external
  requests this build doesn't control the availability or privacy
  implications of. Self-hosting is the fix if that matters for your
  deployment.
- The hero demo's Lighthouse performance score is unverified — asserted
  as a design goal (CSS-only, no JS timers, no video), not measured,
  since there's no browser available in this sandbox to actually run
  Lighthouse against.
- The logo's SVG paths (bubble + anchor tail + node) are hand-authored
  coordinate values, not exported from a real design tool — functional
  and consistent across every usage, but a designer revisiting the
  brand later should treat these as a rough first pass, not a precision
  vector asset.

## Status: all 22 phases complete

There is no next phase. `docs/launch-readiness.md` is the honest final
word on what that does and doesn't mean — 22/22 phases built and
verified in this environment is not the same claim as "ready for real
customers," and that document is where the two are deliberately kept
separate rather than blurred together in a closing paragraph here.

## Phase 3 — Knowledge & RAG

Phase 3 upgrades the knowledge layer with a production-oriented source manager: file ingestion for text-native formats, source metadata, chunk counts, re-indexing, ingestion errors, and a richer knowledge dashboard. The existing pgvector retrieval pipeline remains the grounding layer for agent responses.

### Supported file uploads in this phase
- TXT
- Markdown
- CSV
- JSON
- HTML/HTM

PDF/DOCX binary extraction requires parser dependencies and is intentionally isolated for the next document-parser phase rather than pretending those formats are supported without a reliable extraction engine.

## Phase 17
- Visual drag-and-drop workflow builder
- Durable workflow execution through Inngest
- Background retries and concurrency control
- Long-delay support on durable runs
- Workflow run cancellation and checkpoint reuse
- Production workflow execution settings

## Phase 20
Multi-agent orchestration adds bounded supervisor planning, parallel/sequential specialist execution, dependency/cycle protection, orchestration budgets, run history, and a dedicated orchestration dashboard. See `docs/phase-20-multi-agent-orchestration.md`.

## Phase 30 — Launch, Growth & SaaS Optimization

The cumulative build now includes the final commercial-readiness layer: public pricing, launch center, referral infrastructure, product feedback, growth events, SEO metadata, robots/sitemap, reliability hardening foundations, and the final launch checklist.

See `docs/phase-30-launch-growth.md` and `docs/final-launch-checklist.md` before production deployment.
