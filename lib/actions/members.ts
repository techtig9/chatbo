"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { findUserByEmail, listWorkspaceMembers } from "@/lib/data/members";
import { requireWorkspaceAction, WorkspaceAuthorizationError } from "@/lib/authz/rbac";
import { canAddSeat, upgradeMessage } from "@/lib/billing/credits";
import { inviteMemberSchema } from "@/lib/validation/members";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";
import { sendEmail } from "@/lib/email/resend";
import { teamInviteEmail, invitationAcceptedEmail } from "@/lib/email/templates";
import { getWorkspaceOwner } from "@/lib/notifications/workspace-owner";
import type { WorkspaceMemberRole } from "@/lib/supabase/types";

function redirectWithError(message: string): never {
  redirect(`/dashboard/settings?error=${encodeURIComponent(message)}`);
}

async function requireAdminAccess(action: Parameters<typeof requireWorkspaceAction>[1]) {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!user || !workspace) redirect("/login");

  try {
    requireWorkspaceAction(workspace.role, action);
  } catch (err) {
    if (err instanceof WorkspaceAuthorizationError) {
      redirectWithError("Your role doesn't allow managing team members.");
    }
    throw err;
  }

  return { user, workspace };
}

export async function inviteMember(formData: FormData) {
  const { user, workspace } = await requireAdminAccess("member:invite");

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    redirectWithError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const currentMembers = await listWorkspaceMembers(workspace.workspaceId);
  if (!canAddSeat(currentMembers.length, workspace.plan)) {
    redirectWithError(upgradeMessage("seats"));
  }

  const invitedUser = await findUserByEmail(parsed.data.email);
  if (!invitedUser) {
    // The schema requires a real user_id (workspace_members.user_id is
    // not null), so inviting someone who hasn't signed up isn't
    // supported — tell them clearly rather than silently failing. A
    // real "invite before signup" flow would need a schema change
    // (nullable user_id + an invited_email column), not just this
    // phase's email sending.
    redirectWithError(
      `No chatbo.ai account found for ${parsed.data.email}. They need to sign up first — then you can invite them.`
    );
  }

  const alreadyMember = currentMembers.some((m) => m.userId === invitedUser.id);
  if (alreadyMember) {
    redirectWithError("That person is already a member (or has a pending invite).");
  }

  const supabase = createClient();
  const { error } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.workspaceId,
    user_id: invitedUser.id,
    role: parsed.data.role,
    // joined_at stays null — this is a pending invite until they accept.
  });

  if (error) {
    redirectWithError("Couldn't send the invite. Try again.");
  }

  revalidatePath("/dashboard/settings");

  await createNotification({
    userId: invitedUser.id,
    type: "workspace_invite",
    title: `You've been invited to ${workspace.workspaceName}`,
    body: `${user.name ?? user.email} invited you as ${parsed.data.role}.`,
  });
  const email = teamInviteEmail({
    workspaceName: workspace.workspaceName,
    inviterName: user.name ?? user.email,
    role: parsed.data.role,
  });
  await sendEmail({ to: parsed.data.email, subject: email.subject, html: email.html });

  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user.id,
    action: "member.invited",
    targetType: "workspace_member",
    targetId: invitedUser.id,
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });
  redirect("/dashboard/settings?success=Invite+sent");
}

export async function changeMemberRole(membershipId: string, formData: FormData) {
  const { user, workspace } = await requireAdminAccess("member:changeRole");

  const newRole = formData.get("role");
  if (typeof newRole !== "string" || !["admin", "editor", "viewer"].includes(newRole)) {
    redirectWithError("Invalid role");
  }

  const supabase = createClient();

  // Never let this path touch the owner row — ownership transfer is a
  // deliberately separate, more careful flow this build doesn't
  // implement yet, not something to allow as a side effect of a role
  // dropdown.
  const { data: target } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("id", membershipId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (!target) redirectWithError("Member not found");
  if (target.role === "owner") redirectWithError("The workspace owner's role can't be changed here.");

  const { error } = await supabase
    .from("workspace_members")
    .update({ role: newRole as WorkspaceMemberRole })
    .eq("id", membershipId)
    .eq("workspace_id", workspace.workspaceId);

  if (error) redirectWithError("Couldn't update role.");

  revalidatePath("/dashboard/settings");
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user.id,
    action: "member.role_changed",
    targetType: "workspace_member",
    targetId: membershipId,
    metadata: { fromRole: target.role, toRole: newRole },
  });
  redirect("/dashboard/settings?success=Role+updated");
}

export async function removeMember(membershipId: string) {
  const { user, workspace } = await requireAdminAccess("member:remove");

  const supabase = createClient();
  const { data: target } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("id", membershipId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (!target) redirectWithError("Member not found");
  if (target.role === "owner") redirectWithError("The workspace owner can't be removed.");

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", membershipId)
    .eq("workspace_id", workspace.workspaceId);

  if (error) redirectWithError("Couldn't remove member.");

  revalidatePath("/dashboard/settings");
  await logAuditEvent({
    workspaceId: workspace.workspaceId,
    actorUserId: user.id,
    action: "member.removed",
    targetType: "workspace_member",
    targetId: membershipId,
  });
  redirect("/dashboard/settings?success=Member+removed");
}

export async function acceptInvite(membershipId: string) {
  const { user } = await getCurrentUserAndWorkspace();
  if (!user) redirect("/login");

  const supabase = createClient();
  // The .eq("user_id", ...) here is the real access control — this
  // isn't gated by workspace RBAC (the invitee isn't a member yet),
  // it's gated by "this invite is addressed to you."
  const { data: membership, error } = await supabase
    .from("workspace_members")
    .update({ joined_at: new Date().toISOString() })
    .eq("id", membershipId)
    .eq("user_id", user.id)
    .is("joined_at", null)
    .select("workspace_id")
    .maybeSingle();

  if (error) {
    redirect(`/dashboard/invites?error=${encodeURIComponent("Couldn't accept invite.")}`);
  }

  if (membership?.workspace_id) {
    const owner = await getWorkspaceOwner(membership.workspace_id);
    // Notify whoever manages the workspace that the invite was taken up.
    // There's no invited_by column to notify the specific inviter, so this
    // goes to the owner — same target as the other workspace-lifecycle
    // notifications (payment failed, subscription canceled).
    if (owner && owner.userId !== user.id) {
      const email = invitationAcceptedEmail({ workspaceName: owner.workspaceName, memberEmail: user.email });
      await sendEmail({ to: owner.email, subject: email.subject, html: email.html });
    }
  }

  revalidatePath("/dashboard/invites");
  redirect("/dashboard");
}

export async function declineInvite(membershipId: string) {
  const { user } = await getCurrentUserAndWorkspace();
  if (!user) redirect("/login");

  const supabase = createClient();
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", membershipId)
    .eq("user_id", user.id)
    .is("joined_at", null);

  if (error) {
    redirect(`/dashboard/invites?error=${encodeURIComponent("Couldn't decline invite.")}`);
  }

  revalidatePath("/dashboard/invites");
  redirect("/dashboard/invites?success=Invite+declined");
}
