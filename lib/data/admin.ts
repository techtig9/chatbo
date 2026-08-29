import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function listAllUsers() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load users: ${error.message}`);
  return data ?? [];
}

export interface AdminSubscriptionRow {
  id: string;
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string;
  plan: string;
  status: string;
  creditsRemaining: number;
  renewsAt: string | null;
}

export async function listAllSubscriptions(): Promise<AdminSubscriptionRow[]> {
  const supabase = createAdminClient();

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("id, workspace_id, plan, status, credits_remaining, renews_at");
  if (error) throw new Error(`Failed to load subscriptions: ${error.message}`);
  if (!subscriptions || subscriptions.length === 0) return [];

  const workspaceIds = subscriptions.map((s) => s.workspace_id);
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, owner_id")
    .in("id", workspaceIds);

  const ownerIds = (workspaces ?? []).map((w) => w.owner_id);
  const { data: owners } = await supabase.from("users").select("id, email").in("id", ownerIds);
  const emailByOwnerId = new Map((owners ?? []).map((o) => [o.id, o.email]));
  const workspaceById = new Map((workspaces ?? []).map((w) => [w.id, w]));

  return subscriptions.map((s) => {
    const workspace = workspaceById.get(s.workspace_id);
    return {
      id: s.id,
      workspaceId: s.workspace_id,
      workspaceName: workspace?.name ?? "Unknown workspace",
      ownerEmail: (workspace && emailByOwnerId.get(workspace.owner_id)) ?? "—",
      plan: s.plan,
      status: s.status,
      creditsRemaining: s.credits_remaining,
      renewsAt: s.renews_at,
    };
  });
}

export interface AdminPaymentRow {
  id: string;
  workspaceName: string;
  paddleTransactionId: string | null;
  amount: number | null;
  status: string | null;
  createdAt: string;
}

export async function listAllPayments(limit: number = 100): Promise<AdminPaymentRow[]> {
  const supabase = createAdminClient();

  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, workspace_id, paddle_transaction_id, amount, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load payments: ${error.message}`);
  if (!payments || payments.length === 0) return [];

  const workspaceIds = [...new Set(payments.map((p) => p.workspace_id))];
  const { data: workspaces } = await supabase.from("workspaces").select("id, name").in("id", workspaceIds);
  const nameById = new Map((workspaces ?? []).map((w) => [w.id, w.name]));

  return payments.map((p) => ({
    id: p.id,
    workspaceName: nameById.get(p.workspace_id) ?? "Unknown workspace",
    paddleTransactionId: p.paddle_transaction_id,
    amount: p.amount,
    status: p.status,
    createdAt: p.created_at,
  }));
}
