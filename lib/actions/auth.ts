"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/utils/origin";
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

function getOrigin() {
  return getRequestOrigin();
}

/**
 * Every action below follows the same shape: validate, call Supabase,
 * and redirect with a `?error=` or `?success=` query param the origin
 * page reads server-side to render a message. Deliberately not using
 * useFormState/useFormStatus here — those need React's experimental
 * channel, and pinning the whole app to a canary React build is a much
 * bigger tradeoff than a page reload on form submit.
 */

export async function signUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(
      `/signup?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: `${getOrigin()}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/login?success=${encodeURIComponent(
      "Check your email to confirm your account before logging in."
    )}`
  );
}

export async function signIn(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(
      `/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately generic — never confirm whether the email exists.
    redirect(`/login?error=${encodeURIComponent("Incorrect email or password.")}`);
  }

  // If this account has a verified MFA factor, password sign-in only
  // gets the session to aal1 — don't let it reach the dashboard until
  // the TOTP challenge is also satisfied.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect("/mfa/verify");
  }

  redirect("/dashboard");
}

export async function signInWithGoogle() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getOrigin()}/auth/callback` },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent("Google sign-in failed. Try again.")}`);
  }

  redirect(data.url);
}

export async function forgotPassword(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirect(
      `/forgot-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`
    );
  }

  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getOrigin()}/reset-password`,
  });

  // Same message whether or not the email exists — don't leak account
  // existence through response differences.
  redirect(
    `/forgot-password?success=${encodeURIComponent(
      "If an account exists for that email, a reset link is on its way."
    )}`
  );
}

export async function resetPassword(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(
      `/reset-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?success=Password%20updated.%20Log%20in%20with%20your%20new%20password.");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
