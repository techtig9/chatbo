# e2e smoke test

Exercises the real signup → bot creation → publish → widget pipeline
end to end. Needs a live environment behind it — this cannot run
against mocks.

## Required environment

Point these at a **dedicated test Supabase project — never
production**. The test creates and deletes real accounts.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
E2E_CONFIRM_NOT_PRODUCTION=true
```

`E2E_CONFIRM_NOT_PRODUCTION` isn't optional — the test refuses to run
without it (see `helpers.ts`). It doesn't verify anything technically;
it exists because the real failure mode here isn't "forgot to set up a
test project," it's "ran this with production credentials already
sitting in a shell environment from another project, without
realizing it." A required, deliberately-unusual-named var forces a
conscious moment before anything runs, not just a comment you can
forget to read.

Run the same `supabase/migrations/*.sql` files against the test
project as you would production.

## Running locally

```bash
npm run dev              # in one terminal
npm run test:e2e         # in another
```

Or let Playwright manage the dev server itself (the default in
`playwright.config.ts` when `E2E_BASE_URL` isn't set):

```bash
npm run test:e2e
```

## Running in CI

`.github/workflows/ci.yml`'s `e2e` job needs these repo secrets set
(Settings → Secrets and variables → Actions):

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_ANON_KEY`
- `E2E_SUPABASE_SERVICE_ROLE_KEY`
- `E2E_ANTHROPIC_API_KEY`
- `E2E_VOYAGE_API_KEY`

Without them, the job fails — deliberately, not silently skipped. A
red X for "not configured yet" is a more honest signal than a merge
gate that always reports green because it never actually ran anything.

## Why this test creates real accounts

`confirmTestUserEmail` (see `helpers.ts`) uses the Supabase service
role key to confirm a freshly-signed-up test account's email directly,
rather than either (a) clicking a real confirmation link — there's no
inbox to check in CI — or (b) disabling email confirmation on the test
project, which would make the test pass against a *different* auth
configuration than production actually uses. Confirming out-of-band
keeps the real signup flow, including its real email-confirmation
requirement, exactly as written.

Test accounts are deleted in `afterEach`. `deleteTestUser` deletes any
workspace the account owns *before* deleting the user — the schema
deliberately has no `ON DELETE CASCADE` from `workspaces.owner_id` to
`users.id` (so a random user's deletion can't silently cascade into
deleting a shared workspace other people still belong to), which means
deleting the user directly would fail with a foreign-key violation
otherwise. Caught this while writing the cleanup logic, not after
watching it fail in CI.
