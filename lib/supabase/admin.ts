import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role client. Bypasses Row Level Security entirely.
 *
 * `import "server-only"` above makes it a build error to accidentally
 * import this from a Client Component — that's the main way a service
 * role key leaks into a browser bundle, so we fail at compile time
 * instead of relying on developer discipline.
 *
 * Only ever call this from: Paddle webhook handler, /admin routes
 * (after their own role=admin check), and Inngest background jobs.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
