"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { workspaceOrRedirect } from "@/lib/actions/workspace-switch";
import { logAuditEvent } from "@/lib/audit/log";
import type { WorkflowDefinition, WorkflowTrigger } from "@/lib/workflows/types";
import { runWorkflow } from "@/lib/workflows/engine";
import { toUserMessage } from "@/lib/errors/user-facing";

export async function createWorkflow(formData: FormData) {
  const workspace = await workspaceOrRedirect();
  const name = String(formData.get("name") || "Untitled workflow").trim();
  const trigger = String(formData.get("trigger") || "manual") as WorkflowTrigger;
  const admin = createAdminClient();
  const nodes = [{ id: "trigger-1", type: "trigger", name: "Trigger", config: {} }, { id: "ai-1", type: "ai", name: "AI step", config: { prompt: "{{input.message}}" } }, { id: "end-1", type: "end", name: "End", config: {} }];
  const edges = [{ id: "e1", source: "trigger-1", target: "ai-1" }, { id: "e2", source: "ai-1", target: "end-1" }];
  const { data, error } = await admin.from("workflows").insert({ workspace_id: workspace.workspaceId, name, trigger_type: trigger, nodes, edges }).select("id").single();
  if (error || !data) redirect(`/dashboard/workflows?error=${encodeURIComponent(error?.message || "Could not create workflow")}`);
  revalidatePath("/dashboard/workflows"); redirect(`/dashboard/workflows?workflow=${data.id}`);
}

export async function updateWorkflowDefinition(workflowId: string, definition: WorkflowDefinition) {
  const workspace = await workspaceOrRedirect(); const admin = createAdminClient();
  const { data: existing } = await admin.from("workflows").select("version").eq("id", workflowId).eq("workspace_id", workspace.workspaceId).single();
  if (!existing) redirect("/dashboard/workflows");
  const { error } = await admin.from("workflows").update({ nodes: definition.nodes, edges: definition.edges, version: Number(existing.version || 1) + 1, updated_at: new Date().toISOString() }).eq("id", workflowId).eq("workspace_id", workspace.workspaceId);
  if (error) redirect(`/dashboard/workflows?workflow=${workflowId}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/workflows");
}

export async function saveWorkflowJson(workflowId: string, formData: FormData) {
  const workspace = await workspaceOrRedirect(); const admin = createAdminClient();
  let definition: WorkflowDefinition;
  try { definition = JSON.parse(String(formData.get("definition") || "{}")); } catch { redirect(`/dashboard/workflows?workflow=${workflowId}&error=Invalid%20workflow%20JSON`); }
  if (!Array.isArray(definition.nodes) || !Array.isArray(definition.edges)) redirect(`/dashboard/workflows?workflow=${workflowId}&error=Workflow%20must%20contain%20nodes%20and%20edges`);
  await updateWorkflowDefinition(workflowId, definition);
  redirect(`/dashboard/workflows?workflow=${workflowId}&success=Workflow%20saved`);
}

export async function setWorkflowStatus(workflowId: string, status: "draft" | "active" | "paused" | "archived") {
  const { user, workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) redirect("/login");
  const admin = createAdminClient();
  await admin.from("workflows").update({ status, updated_at: new Date().toISOString() }).eq("id", workflowId).eq("workspace_id", workspace.workspaceId);
  if (status === "active") {
    // "workflow deployed" for the dashboard activity feed (spec section 68).
    await logAuditEvent({ workspaceId: workspace.workspaceId, actorUserId: user?.id ?? null, action: "workflow.activated", targetType: "workflow", targetId: workflowId });
  }
  revalidatePath("/dashboard/workflows");
}

export async function deleteWorkflow(workflowId: string) {
  const workspace = await workspaceOrRedirect(); const admin = createAdminClient();
  await admin.from("workflows").delete().eq("id", workflowId).eq("workspace_id", workspace.workspaceId);
  revalidatePath("/dashboard/workflows"); redirect("/dashboard/workflows");
}

export async function runWorkflowManual(workflowId: string) {
  const workspace = await workspaceOrRedirect();
  try { await runWorkflow(workflowId, workspace.workspaceId, { message: "Manual workflow test" }, "manual"); }
  catch (error) { console.error(`[workflows] manual run failed for ${workflowId}`, error); redirect(`/dashboard/workflows?workflow=${workflowId}&error=${encodeURIComponent(toUserMessage(error, "run this workflow"))}`); }
  revalidatePath("/dashboard/workflows");
  redirect(`/dashboard/workflows?workflow=${workflowId}&success=Workflow%20run%20completed`);
}

export async function runWorkflowDurable(workflowId: string) {
  const workspace = await workspaceOrRedirect();
  const admin = createAdminClient();
  const { data: workflow } = await admin.from("workflows").select("id,trigger_type").eq("id", workflowId).eq("workspace_id", workspace.workspaceId).single();
  if (!workflow) redirect("/dashboard/workflows?error=Workflow%20not%20found");
  const { data: run, error } = await admin.from("workflow_runs").insert({ workflow_id: workflowId, workspace_id: workspace.workspaceId, trigger_type: "manual", status: "queued", input: { message: "Durable workflow test" } }).select("id").single();
  if (error || !run) redirect(`/dashboard/workflows?workflow=${workflowId}&error=${encodeURIComponent(error?.message || "Could not queue workflow")}`);
  const { inngest } = await import("@/lib/inngest/client");
  await inngest.send({ name: "chatbo/workflow.run.requested", data: { workflowId, workspaceId: workspace.workspaceId, runId: run.id, input: { message: "Durable workflow test" }, triggerType: "manual" } });
  revalidatePath("/dashboard/workflows");
  redirect(`/dashboard/workflows?workflow=${workflowId}&success=Workflow%20queued%20for%20durable%20execution`);
}

export async function cancelWorkflowRun(runId: string) {
  const workspace = await workspaceOrRedirect();
  const admin = createAdminClient();
  await admin.from("workflow_runs").update({ status: "cancelled", completed_at: new Date().toISOString(), error: "Cancelled by workspace user" }).eq("id", runId).eq("workspace_id", workspace.workspaceId).in("status", ["queued", "running"]);
  revalidatePath("/dashboard/workflows");
}
