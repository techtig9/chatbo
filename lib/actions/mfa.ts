"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { listUserTotpFactors, deleteAllUserTotpFactors } from "@/lib/mfa/admin-api";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/mfa/recovery-codes";
import { publicChatRateLimiter } from "@/lib/chat/rate-limit";
import { logAuditEvent } from "@/lib/audit/log";
import { z } from "zod";

/**
 * Generates a fresh set of recovery codes and stores only their hashes.
 * Called right after the client-side enroll+verify flow succeeds — this
 * function itself re-checks that a verified factor actually exists
 * rather than trusting the client's word for it, since it's about to
 * hand back plaintext codes that grant real account-recovery power.
 */
export async function generateAndStoreRecoveryCodes(): Promise<string[]> {
  const { user } = await getCurrentUserAndWorkspace();
  if (!user) redirect("/login");

  const factors = await listUserTotpFactors(user.id);
  const hasVerifiedFactor = factors.some((f) => f.status === "verified");
  if (!hasVerifiedFactor) {
    throw new Error("No verified MFA factor found — enroll first.");
  }

  const admin = createAdminClient();

  // Regenerating invalidates any previous batch — old codes for this
  // user, used or not, are deleted first so there's never a stale
  // "leftover" code from an earlier enrollment still valid.
  await admin.from("mfa_recovery_codes").delete().eq("user_id", user.id);

  const codes = generateRecoveryCodes();
  const { error } = await admin.from("mfa_recovery_codes").insert(
    codes.map((code) => ({ user_id: user.id, code_hash: hashRecoveryCode(code) }))
  );

  if (error) {
    throw new Error("Couldn't save recovery codes. Try regenerating them from Profile.");
  }

  return codes; // plaintext — this is the one and only time it exists outside the user's own copy
}

const recoverSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().min(1),
});

export type RecoverMfaResult = { success: boolean; error?: string };

/**
 * Public, unauthenticated recovery flow: prove account ownership with a
 * recovery code, and every TOTP factor on the account gets deleted via
 * the admin API. The user then logs in with just their password and can
 * re-enroll a new device from Profile.
 */
export async function recoverMfaAccount(formData: FormData): Promise<RecoverMfaResult> {
  const parsed = recoverSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { success: false, error: "Enter a valid email and recovery code." };
  }

  // This is a sensitive, unauthenticated, brute-forceable endpoint —
  // rate limit by email before touching the database at all.
  const rateLimit = await publicChatRateLimiter.checkAndRecord(`mfa-recover:${parsed.data.email}`, {
    windowMs: 60_000,
    maxRequests: 5,
  });
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many attempts. Try again in a minute." };
  }

  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("id")
    .eq("email", parsed.data.email.trim().toLowerCase())
    .maybeSingle();

  // Same generic error whether the email doesn't exist or the code is
  // wrong — don't let this endpoint confirm which accounts exist.
  const genericError = "That email and recovery code don't match.";
  if (!userRow) return { success: false, error: genericError };

  const codeHash = hashRecoveryCode(parsed.data.code);
  const { data: matchingCode } = await admin
    .from("mfa_recovery_codes")
    .select("id")
    .eq("user_id", userRow.id)
    .eq("code_hash", codeHash)
    .is("used_at", null)
    .maybeSingle();

  if (!matchingCode) return { success: false, error: genericError };

  await admin
    .from("mfa_recovery_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", matchingCode.id);

  await deleteAllUserTotpFactors(userRow.id);

  return { success: true };
}

export async function setWorkspaceRequireMfa(workspaceId: string, requireMfa: boolean) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace || workspace.workspaceId !== workspaceId || workspace.role !== "owner") {
    redirect("/dashboard/settings?error=Only+the+workspace+owner+can+change+this");
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ require_mfa: requireMfa })
    .eq("id", workspaceId);

  if (error) {
    redirect("/dashboard/settings?error=Couldn%27t+update+MFA+requirement");
  }

  await logAuditEvent({
    workspaceId,
    actorUserId: user?.id ?? null,
    action: "workspace.mfa_requirement_changed",
    targetType: "workspace",
    targetId: workspaceId,
    metadata: { requireMfa },
  });
  redirect("/dashboard/settings?success=Updated");
}
