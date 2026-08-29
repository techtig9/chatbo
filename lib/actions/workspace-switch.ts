"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace, ACTIVE_WORKSPACE_COOKIE, type CurrentWorkspace } from "@/lib/data/workspace";

/**
 * Small DRY wrapper around the "get the current workspace or bounce to
 * /login" guard repeated at the top of nearly every server action in
 * lib/actions/*.ts. lib/actions/agents.ts and lib/actions/orchestration.ts
 * already imported this (it's what the multi-agent pages need), but it was
 * never actually defined here — a build-blocking gap found while chasing
 * `next build` to green.
 */
export async function workspaceOrRedirect(): Promise<CurrentWorkspace> {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");
  return workspace;
}

export async function switchActiveWorkspace(workspaceId: string) {
  const { user } = await getCurrentUserAndWorkspace();
  if (!user) redirect("/login");

  const supabase = createClient();
  // Verify the user is actually an accepted member before trusting the
  // cookie value — otherwise a crafted request could switch into a
  // workspace they don't belong to.
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .not("joined_at", "is", null)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard?error=Not+a+member+of+that+workspace");
  }

  cookies().set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  redirect("/dashboard");
}
