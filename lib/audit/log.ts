import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every loggable action, centralized here so a call site can't invent
 * an ad hoc string — that's what keeps this the single source of truth
 * the spec asked for ("every state-changing action... through one
 * logging middleware, not scattered inline calls"), the same principle
 * `WorkspaceAction` already applies to authorization.
 */
export type AuditAction =
  | "bot.created"
  | "bot.updated"
  | "bot.published"
  | "bot.unpublished"
  | "bot.archived"
  | "bot.unarchived"
  | "bot.duplicated"
  | "bot.deleted"
  | "bot.domain.added"
  | "bot.deployed.staging"
  | "bot.deployed.production"
  | "bot.rollback.staging"
  | "bot.rollback.production"
  | "knowledge_source.added"
  | "knowledge_source.deleted"
  | "knowledge_source.reindexed"
  | "agent_tool.enabled"
  | "agent_tool.disabled"
  | "agent_tool.configured"
  | "member.invited"
  | "member.role_changed"
  | "member.removed"
  | "invite.accepted"
  | "invite.declined"
  | "share_link.created"
  | "workspace.mfa_requirement_changed"
  | "subscription.plan_changed"
  | "api_key.created"
  | "api_key.revoked"
  | "webhook_endpoint.created"
  | "webhook_endpoint.deleted"
  | "team.created"
  | "team.deleted"
  | "organization.member_role_changed"
  | "privacy.settings_updated"
  | "workflow.activated"
  | "integration.connected"
  | "evaluation.completed"
  // Data-subject-request lifecycle: created with a request type
  // (export/deletion/access/rectification/restriction) and later updated
  // with a status (processing/completed/rejected/cancelled) — both are
  // runtime-validated against a fixed list at the call site (see
  // lib/actions/privacy.ts) but read from a form field, so they're plain
  // `string` to the type system, not a literal union.
  | `privacy.dsr_${string}`;

export type AuditTargetType =
  | "bot"
  | "knowledge_source"
  | "agent_tool"
  | "workspace_member"
  | "share"
  | "workspace"
  | "subscription"
  | "api_key"
  | "webhook_endpoint"
  | "team"
  | "organization"
  | "organization_member"
  | "data_subject_request"
  | "workflow"
  | "integration_connection"
  | "eval_run";

/**
 * Writes one audit log entry. Uses the admin client since the actor has
 * already passed their own RBAC check by the time this is called — this
 * function's job is just to record what happened, not to re-authorize
 * it. Never throws: a logging failure should never take down the actual
 * action it's describing, so errors are swallowed after being reported
 * to the console — worth wiring to Sentry once Phase 1.15 exists.
 */
export async function logAuditEvent(params: {
  workspaceId: string;
  actorUserId: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("audit_logs").insert({
      workspace_id: params.workspaceId,
      actor_user_id: params.actorUserId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? null,
    });
    if (error) {
      console.error(`Audit log write failed for ${params.action}:`, error.message);
    }
  } catch (err) {
    console.error(`Audit log write threw for ${params.action}:`, err);
  }
}
