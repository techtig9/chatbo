import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordOrganizationSecurityEvent(input: {
  organizationId: string;
  actorUserId?: string | null;
  eventType: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  result?: "success" | "failure" | "denied";
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("organization_security_events").insert({
    organization_id: input.organizationId,
    user_id: input.actorUserId ?? null,
    event_type: input.eventType,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: {
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      result: input.result ?? "success",
      ...(input.metadata ?? {}),
    },
  });
  await admin.from("organization_audit_events").insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId ?? null,
    event_type: input.eventType,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    result: input.result ?? "success",
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  });
}

export function securityScore(input: {
  requireMfa: boolean;
  enforceSso: boolean;
  restrictDomains: boolean;
  hasVerifiedDomain: boolean;
  hasSso: boolean;
  hasScim: boolean;
  hasIpPolicy: boolean;
}) {
  const checks = [
    input.requireMfa,
    input.enforceSso,
    input.restrictDomains && input.hasVerifiedDomain,
    input.hasSso,
    input.hasScim,
    input.hasIpPolicy,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
