import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { IntegrationCategory } from "@/lib/integrations/catalog";

export interface IntegrationConnectionData {
  id: string;
  provider: string;
  status: "pending" | "connected" | "error" | "disconnected";
  accountId: string | null;
  lastUsedAt: string | null;
  lastError: string | null;
  grantedAgentCount: number;
}

/** Counts enabled permission rows per connection — extracted as a pure
 * function so the "only count enabled grants, not revoked ones" rule is
 * unit-testable without mocking Supabase. */
export function countGrantedPermissions(permissions: { connection_id: string; enabled: boolean }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of permissions) {
    if (!p.enabled) continue;
    counts.set(p.connection_id, (counts.get(p.connection_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * One row per connected provider, enriched with the "Permissions"
 * summary spec section 79 wants on the card itself (previously only
 * reachable by opening the provider's own manage-access page) — a count
 * of agents actually granted access, not just whether a connection exists.
 */
export async function getIntegrationConnections(workspaceId: string): Promise<Map<string, IntegrationConnectionData>> {
  const supabase = createClient();
  const { data: connections } = await supabase
    .from("integration_connections")
    .select("id, provider, status, account_id, last_used_at, last_error")
    .eq("workspace_id", workspaceId);
  if (!connections || connections.length === 0) return new Map();

  const connectionIds = connections.map((c) => c.id);
  const { data: permissions } = await supabase
    .from("agent_integration_permissions")
    .select("connection_id, enabled")
    .in("connection_id", connectionIds);

  const grantedCountByConnection = countGrantedPermissions(permissions ?? []);

  return new Map(
    connections.map((c) => [
      c.provider,
      {
        id: c.id,
        provider: c.provider,
        status: c.status,
        accountId: c.account_id,
        lastUsedAt: c.last_used_at,
        lastError: c.last_error,
        grantedAgentCount: grantedCountByConnection.get(c.id) ?? 0,
      },
    ])
  );
}

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  commerce: "Commerce",
  crm: "CRM",
  support: "Support",
  communication: "Communication",
  productivity: "Productivity",
  payments: "Payments",
};
