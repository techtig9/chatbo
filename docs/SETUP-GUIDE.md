# Chatbo.ai — Setup & Deployment Guide

A step-by-step guide to take this repository from source code to a live,
paying-customer SaaS product.

**Read this first:**

- Every value below is a **secret**. Put secrets in the Vercel dashboard,
  never in a file that gets committed to git.
- The only file that ever holds secrets locally is `.env.local`, which is
  git-ignored. `.env.example` is the template — it holds names only, never
  values.
- Work through the stages in order. Stage 1 is the minimum to get a working
  site. Stage 2 is what you need before charging real money.

---

## Stage 0 — Generate your own app secrets

Three secrets are not obtained from any third party — you generate them
yourself. Run this once, and keep the output somewhere safe (a password
manager, not a text file on your desktop):

```bash
node -e '
const c = require("node:crypto");
console.log("TOOL_SECRET_KEY=" + c.randomBytes(32).toString("base64"));
console.log("CHANNEL_OAUTH_SECRET=" + c.randomBytes(32).toString("hex"));
console.log("WEBHOOK_SIGNING_SECRET=" + c.randomBytes(32).toString("hex"));
'
```

What each one does:

| Variable | Purpose | Format |
|---|---|---|
| `TOOL_SECRET_KEY` | AES-256-GCM key that encrypts every stored integration and channel credential (`lib/tools/integration-config.ts`) | base64 of exactly 32 bytes |
| `CHANNEL_OAUTH_SECRET` | Signs the OAuth `state` parameter so a channel connect flow cannot be forged | any long random string |
| `WEBHOOK_SIGNING_SECRET` | Bearer token guarding the internal cron routes (`/api/webhooks/process-pending`, `/api/backups/run`, `/api/notifications/send-weekly-digest`) | any long random string |

**`TOOL_SECRET_KEY` must decode to exactly 32 bytes** or the app throws on
startup of any integration path. Verify with:

```bash
node -e 'console.log(Buffer.from(process.argv[1], "base64").length)' "<your-key>"
# must print: 32
```

### Warning about rotating `TOOL_SECRET_KEY`

Once customers have connected integrations, their credentials are encrypted
with this key. Changing it makes all of them permanently unreadable. Set it
once, before launch, and never change it without a planned re-encryption.

---

## Stage 1 — Minimum to get a live site

### 1.1 Supabase (database + authentication)

1. Go to https://supabase.com/dashboard and create a new project.
2. Choose a region close to your customers. Save the database password.
3. Go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

**The `service_role` key bypasses all row-level security.** It must never be
given a `NEXT_PUBLIC_` prefix and must never reach the browser.

### 1.2 Apply the database migrations

There are 44 migration files in `supabase/migrations/`. They must be applied
**in filename order** — later migrations depend on earlier ones.

Option A — Supabase CLI (recommended):

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Option B — by hand: open **SQL Editor** in the Supabase dashboard, then paste
and run each file in order, starting at `0001_init.sql` and ending at
`0044_agent_runs_fallback_flag.sql`.

Note that `0002` exists twice (`0002_agent_builder_config.sql` and
`0002_credits_functions.sql`). Run both; either order works.

Afterwards, check **Database → Tables** and confirm the tables exist, and
**Authentication → Policies** to confirm RLS is enabled on them.

### 1.3 Groq (the main AI provider)

1. Go to https://console.groq.com/keys
2. Create an API key → `GROQ_API_KEY`

Groq is first in the routing chain and has a usable free tier. The app skips
any provider whose key is missing, so this one key is enough to start.

### 1.4 Voyage AI (embeddings for knowledge search)

1. Go to https://dashboard.voyageai.com and create an API key
2. → `VOYAGE_API_KEY`

Without this, document upload and knowledge retrieval will not work. Chat
itself still works.

### 1.5 Vercel (hosting)

1. Go to https://vercel.com/new and import this GitHub repository.
2. Framework preset: **Next.js**. Leave build settings at their defaults.
3. Before the first deploy, open **Settings → Environment Variables** and add
   everything gathered so far, plus:
   - `APP_URL` = your production URL (e.g. `https://chatbo.ai`)
4. Deploy.

Add each variable to **Production**, and to **Preview** if you want preview
deployments to work.

### 1.6 First smoke test

| Check | Expected |
|---|---|
| `https://<your-url>/` | Marketing page loads |
| `https://<your-url>/api/health/live` | Returns OK |
| `https://<your-url>/api/health/ready` | Returns OK (this one checks the database) |
| Sign up at `/signup` | Account is created, you land on `/dashboard` |
| Create a bot and send a message | You get an AI reply |

If `/api/health/ready` fails, the problem is almost always Supabase env vars
or unapplied migrations.

---

## Stage 2 — Before taking real money

### 2.1 Paddle (billing)

Paddle is a merchant of record — it handles global sales tax for you, which
is why this project uses it instead of raw card processing.

1. Sign up at https://www.paddle.com and complete seller verification. **This
   takes days, sometimes longer — start it early.**
2. Work in **sandbox** first: https://sandbox-vendors.paddle.com
3. Create three products with a recurring price each, and copy the **price
   ID** (starts with `pri_`) of each:
   - Starter → `PADDLE_PRICE_ID_STARTER`
   - Pro → `PADDLE_PRICE_ID_PRO`
   - Business → `PADDLE_PRICE_ID_BUSINESS`
4. **Developer Tools → Authentication**: create a client-side token →
   `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` (this one is public by design), and an
   API key → `PADDLE_API_KEY`.
5. **Developer Tools → Notifications**: add a webhook destination pointing at
   `https://<your-url>/api/webhooks/paddle`. Subscribe to the subscription
   and transaction events. Copy the secret → `PADDLE_WEBHOOK_SECRET`.
6. Set `PADDLE_ENVIRONMENT=sandbox` while testing, then `production` at
   launch — and swap every Paddle value for its production equivalent at the
   same time. Sandbox IDs do not work in production.

Test in sandbox with Paddle's test cards: subscribe, upgrade, cancel, and
confirm the plan changes in your own database each time.

### 2.2 Resend (transactional email)

1. Sign up at https://resend.com
2. **Domains** → add your domain and complete the DNS records it gives you.
   Wait for verification. You cannot send from an unverified domain.
3. **API Keys** → create one → `RESEND_API_KEY`
4. `RESEND_FROM_EMAIL` = e.g. `Chatbo <notifications@yourdomain.com>` — the
   address must be on the verified domain.

### 2.3 Upstash Redis (rate limiting and caching)

1. Go to https://console.upstash.com and create a Redis database.
2. Pick the region matching your Vercel deployment region.
3. From the **REST API** section copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

Without this, rate limiting degrades and you have no protection against a
single user draining your AI credits.

### 2.4 Inngest (background jobs)

1. Sign up at https://www.inngest.com and create an app.
2. Copy the **Event Key** → `INNGEST_EVENT_KEY` and the **Signing Key** →
   `INNGEST_SIGNING_KEY`.
3. Register your endpoint: `https://<your-url>/api/inngest`

This drives document ingestion, scheduled re-indexing, and digests.

### 2.5 Sentry (error tracking)

1. Sign up at https://sentry.io and create a **Next.js** project.
2. Copy the DSN into **both** `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`. A
   Sentry DSN is safe to expose — it only permits submitting events.
3. Optional, for readable stack traces: set `SENTRY_ORG`, `SENTRY_PROJECT`,
   and generate a `SENTRY_AUTH_TOKEN`. Without all three, the build simply
   skips source-map upload instead of failing.

### 2.6 Schedule the cron routes

Three routes need to be called on a schedule, each authenticated with
`Authorization: Bearer <WEBHOOK_SIGNING_SECRET>`:

| Route | Suggested schedule |
|---|---|
| `/api/webhooks/process-pending` | every 5 minutes |
| `/api/notifications/send-weekly-digest` | weekly |
| `/api/backups/run` | weekly |

Use Vercel Cron (`vercel.json`), Inngest scheduled functions, or any external
scheduler.

---

## Stage 3 — Optional extras

### 3.1 Backup AI providers (failover)

The gateway routes **Groq → Cerebras → OpenRouter**, and adds **Anthropic
Claude** only for requests it classifies as complex. A provider with no key
is skipped, so add these only as you want them:

| Variable | Where |
|---|---|
| `CEREBRAS_API_KEY` | https://cloud.cerebras.ai |
| `OPENROUTER_API_KEY` | https://openrouter.ai/keys |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |

Gemini is deliberately **not** in the automatic chat chain — it stays
available for explicit use only.

Model overrides (`GROQ_MODEL`, `CEREBRAS_MODEL`, `OPENROUTER_MODEL`,
`ANTHROPIC_MODEL`) have working defaults; change them only if you have a
reason. The `AI_COST_*` variables are optional cost metadata for reporting —
leave them at `0` until you enter your real per-million-token pricing.

### 3.2 Backups to object storage

Any S3-compatible provider works — AWS S3, Cloudflare R2, Backblaze B2:

- `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`,
  `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_S3_REGION`
- `BACKUP_S3_ENDPOINT` — omit for real AWS S3, set it for everyone else

Run a restore drill before launch. An untested backup is not a backup.

### 3.3 OAuth integrations

Only configure the providers you actually intend to offer. Each needs an
OAuth app registered with that provider, with the redirect URL pointing back
at your domain:

Slack, Discord, Shopify, Stripe, HubSpot, Salesforce, Zendesk, Google,
Microsoft, Notion — each supplying a `*_CLIENT_ID` / `*_CLIENT_SECRET` pair.

### 3.4 Concierge bot

`CONCIERGE_BOT_ID` is set **after** you run the concierge seed action once
from **Admin panel → System**. It is not needed for the app to build or run —
only for the in-dashboard "Ask chatbo" launcher and the marketing-site widget
to appear.

---

## Stage 4 — Launch checklist

Before announcing, verify:

- [ ] Custom domain connected in Vercel, HTTPS active
- [ ] `APP_URL` matches the real production domain
- [ ] `PADDLE_ENVIRONMENT=production` with production Paddle keys and price IDs
- [ ] A real card completes a real subscription
- [ ] `/api/health/live` and `/api/health/ready` are monitored by an uptime service
- [ ] Sentry receiving events; alerts routed somewhere you actually read
- [ ] Backup taken **and a restore tested**
- [ ] Supabase RLS reviewed on every table
- [ ] Privacy policy and terms published
- [ ] Support email active and monitored
- [ ] `.env.local` is not committed; no secret appears anywhere in git history

The fuller pre-launch list lives in `docs/final-launch-checklist.md`.

---

## Local development

```bash
cp .env.example .env.local     # then fill in values
npm install
npm run typecheck
npm run lint
npm run build
npm run dev                    # http://localhost:3000
```

Set `APP_URL=http://localhost:3000` in `.env.local`. Tests: `npm test`
(Vitest) and `npm run test:e2e` (Playwright).

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Missing TOOL_SECRET_KEY` | Not set, or set on the wrong Vercel environment |
| `TOOL_SECRET_KEY must be a base64-encoded 32-byte key` | Wrong length — regenerate with the Stage 0 command |
| `/api/health/ready` fails | Supabase env vars wrong, or migrations not applied |
| Chat returns a provider error | No AI provider key set, or every configured provider is rate-limited |
| Knowledge upload does nothing | `VOYAGE_API_KEY` missing, or Inngest not registered |
| Paddle webhook 401s | `PADDLE_WEBHOOK_SECRET` does not match the one in the Paddle dashboard |
| Emails never arrive | Resend domain not verified, or `RESEND_FROM_EMAIL` is not on that domain |
| Env change had no effect | Vercel needs a **redeploy** after env vars change |

---

## Security rules — never break these

1. Never add a `NEXT_PUBLIC_` prefix to a provider API key, the Supabase
   `service_role` key, or any `*_SECRET`. That prefix ships the value to
   every visitor's browser.
2. Only three values are public by design:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` — plus `NEXT_PUBLIC_SENTRY_DSN`, which
   is write-only by design.
3. Never commit `.env.local`.
4. If a secret is ever pasted into a chat, a screenshot, an issue, or a
   commit — rotate it at the provider. Assume it is compromised.
