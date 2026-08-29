import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { welcomeEmail } from "@/lib/email/templates";

/**
 * Handles two flows that both land here:
 *  - Google OAuth redirect (?code=...)
 *  - Email confirmation / magic link (?code=...)
 * Supabase's PKCE flow uses the same `code` exchange for both.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectedFrom") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) await sendWelcomeEmailOnce(data.user.id);
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "That link is invalid or has expired. Please try again."
    )}`
  );
}

/**
 * Sends the welcome email exactly once per user, on whichever request
 * first lands here after their account exists (email confirmation, magic
 * link, or first OAuth sign-in — this route runs on every one of those,
 * not just the very first). The atomic
 * "update ... where welcome_email_sent_at is null" only succeeds (returns
 * a row) for the request that wins the race, so concurrent/duplicate
 * callbacks (e.g. a double-clicked confirmation link) can't double-send.
 */
async function sendWelcomeEmailOnce(userId: string) {
  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("users")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", userId)
    .is("welcome_email_sent_at", null)
    .select("id, name, email")
    .maybeSingle();
  if (!updated) return; // Already sent (or user row not found yet) — nothing to do.

  const { data: workspace } = await admin
    .from("workspaces")
    .select("name")
    .eq("owner_id", userId)
    .maybeSingle();
  if (!workspace) return;

  const email = welcomeEmail({ name: updated.name, workspaceName: workspace.name });
  await sendEmail({ to: updated.email, subject: email.subject, html: email.html });
}
