"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { requireWorkspaceAction, WorkspaceAuthorizationError } from "@/lib/authz/rbac";


async function current() { const { user, workspace } = await getCurrentUserAndWorkspace(); if (!user || !workspace) throw new Error("Not signed in."); return { user, workspace }; }

export async function decideApproval(approvalId: string, decision: "approved" | "rejected", comment?: string) {
  const { user, workspace } = await current();
  try { requireWorkspaceAction(workspace.role, "workflow:approve"); } catch (e) { if (e instanceof WorkspaceAuthorizationError) throw new Error("Your role cannot approve workflow actions."); throw e; }
  const admin = createAdminClient();
  const approvalsDb = admin as any;
  const { data: approval } = await approvalsDb.from("workflow_approvals").select("id,workflow_id,workflow_run_id,workspace_id,status,approver_role,title").eq("id", approvalId).eq("workspace_id", workspace.workspaceId).single();
  if (!approval) throw new Error("Approval not found.");
  if (approval.status !== "pending") throw new Error("This approval is no longer pending.");
  const allowed = { owner: ["owner"], admin: ["owner", "admin"], editor: ["owner", "admin", "editor"] }[approval.approver_role as "owner" | "admin" | "editor"] ?? [];
  if (!allowed.includes(workspace.role)) throw new Error("You do not have the required approval role.");
  const now = new Date().toISOString();
  const { error } = await approvalsDb.from("workflow_approvals").update({ status: decision, decision_comment: comment?.trim() || null, decided_by: user.id, decided_at: now }).eq("id", approvalId).eq("status", "pending");
  if (error) throw new Error(error.message);
  if (decision === "rejected") await admin.from("workflow_runs").update({ status: "failed", error: `Approval rejected${comment ? `: ${comment}` : ""}`, completed_at: now }).eq("id", approval.workflow_run_id).eq("workspace_id", workspace.workspaceId).in("status", ["running", "queued"]);
  if (decision === "approved") {
    await admin.from("workflow_runs").update({ status: "queued", error: null }).eq("id", approval.workflow_run_id).eq("workspace_id", workspace.workspaceId).in("status", ["awaiting_approval", "running"]);
    const { inngest } = await import("@/lib/inngest/client");
    await inngest.send({ name: "chatbo/workflow.approval.resolved", data: { workflowId: approval.workflow_id, workspaceId: workspace.workspaceId, runId: approval.workflow_run_id, approvalId, decision } });
  }
  revalidatePath("/dashboard/approvals"); revalidatePath("/dashboard/workflows");
}

export async function expireApprovals() {
  const { workspace } = await current(); const admin = createAdminClient();
  await (admin as any).from("workflow_approvals").update({ status: "expired", decided_at: new Date().toISOString() }).eq("workspace_id", workspace.workspaceId).eq("status", "pending").lt("expires_at", new Date().toISOString());
  revalidatePath("/dashboard/approvals");
}
