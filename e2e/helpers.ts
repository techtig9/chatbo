import { createClient } from "@supabase/supabase-js";

/**
 * Uses the service role key directly (not the app's own admin client —
 * this file runs in Playwright's Node process, outside the Next.js app
 * entirely) to confirm a freshly-signed-up test account's email and to
 * delete it afterward, so CI runs don't accumulate test accounts and
 * don't require weakening "confirm email" for the real signup flow.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "e2e tests need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set — " +
        "point these at a dedicated test Supabase project, never production."
    );
  }

  // The app and the e2e test process read the SAME env var name by
  // design (see .github/workflows/ci.yml — the E2E_SUPABASE_URL *secret*
  // maps into the same NEXT_PUBLIC_SUPABASE_URL runtime var the app
  // itself reads), so there's no separate "the app's real URL" to
  // programmatically compare this against within one run. The real
  // failure mode this guards against is someone running e2e tests
  // locally with production credentials already sitting in their shell
  // environment from another project, without realizing it — a
  // required, deliberately-unusual-named confirmation env var forces a
  // conscious "yes, I checked" moment instead of relying on remembering
  // to swap .env files every time.
  if (process.env.E2E_CONFIRM_NOT_PRODUCTION !== "true") {
    throw new Error(
      "Refusing to run — this test creates and deletes real accounts. " +
        "Set E2E_CONFIRM_NOT_PRODUCTION=true only after confirming " +
        `NEXT_PUBLIC_SUPABASE_URL (currently: ${url}) points at a dedicated ` +
        "test project, never production."
    );
  }

  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function generateTestEmail(): string {
  return `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function confirmTestUserEmail(email: string): Promise<string> {
  const admin = getAdminClient();

  // Poll briefly — the handle_new_user trigger (0001_init.sql) that
  // creates the public.users row runs async relative to the signup
  // request completing, so it may not exist the instant signup returns.
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data } = await admin.from("users").select("id").eq("email", email).maybeSingle();
    if (data) {
      await admin.auth.admin.updateUserById(data.id, { email_confirm: true });
      return data.id;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Test user ${email} never appeared in public.users — signup may have failed`);
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = getAdminClient();

  // workspaces.owner_id intentionally has no ON DELETE CASCADE (deleting
  // a user shouldn't silently delete a workspace other people might
  // still be members of) — so deleting the auth user directly would hit
  // a foreign-key violation for any user who owns a workspace, which is
  // every signed-up test account (the handle_new_user trigger always
  // creates one). Delete owned workspaces first; that cascades through
  // bots/knowledge/conversations/members via the FKs already in the
  // schema, then the user delete succeeds cleanly.
  const { data: ownedWorkspaces } = await admin.from("workspaces").select("id").eq("owner_id", userId);
  for (const workspace of ownedWorkspaces ?? []) {
    await admin.from("workspaces").delete().eq("id", workspace.id);
  }

  await admin.auth.admin.deleteUser(userId);
}
