import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser-side Supabase client. Reads the two public, safe-to-expose
 * env vars only — never the service role key.
 *
 * Throws early and loudly if the env vars are missing, instead of
 * failing silently deep inside a fetch call later.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill in your Supabase project's values."
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}
