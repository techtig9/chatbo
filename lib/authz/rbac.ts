import type { WorkspaceMemberRole } from "@/lib/supabase/types";

/**
 * Every action any route can take on workspace-owned resources.
 * Add to this list rather than inventing an ad hoc string at a call site —
 * that's what keeps `authorizeWorkspaceAction` the single source of truth
 * the spec asked for, instead of checks scattered across route handlers.
 */
export type WorkspaceAction =
  | "bot:create"
  | "bot:edit"
  | "bot:delete"
  | "bot:publish"
  | "knowledge:manage"
  | "conversation:read"
  | "member:invite"
  | "member:remove"
  | "member:changeRole"
  | "billing:manage"
  | "billing:read"
  | "workspace:delete"
  | "apikey:manage"
  | "webhook:manage"
  | "audit:read"
  | "analytics:read"
  | "workflow:approve"
  | "team:manage"
  | "organization:manage"
  | "organization:security"
  | "organization:billing";

// Lower index = fewer permissions. Every role also has everything the
// roles below it have — checked via index comparison, not a duplicated
// permission list per role.
const ROLE_RANK: Record<WorkspaceMemberRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

// The minimum role each action requires.
const ACTION_MIN_ROLE: Record<WorkspaceAction, WorkspaceMemberRole> = {
  "conversation:read": "viewer",
  "analytics:read": "viewer",
  "bot:create": "editor",
  "bot:edit": "editor",
  "bot:publish": "editor",
  "knowledge:manage": "editor",
  "bot:delete": "admin",
  "member:invite": "admin",
  "member:remove": "admin",
  "member:changeRole": "admin",
  "apikey:manage": "admin",
  "webhook:manage": "admin",
  "audit:read": "admin",
  "billing:read": "admin",
  "billing:manage": "owner",
  "workspace:delete": "owner",
  "workflow:approve": "editor",
  "team:manage": "admin",
  "organization:manage": "admin",
  "organization:security": "admin",
  "organization:billing": "owner",
};

/**
 * The one function every workspace-scoped route/Server Action must call
 * before doing anything state-changing. Deliberately synchronous and
 * side-effect-free — callers fetch the caller's role themselves (from
 * `workspace_members`) and pass it in, so this stays trivially testable
 * and can't accidentally hit the database twice.
 */
export function authorizeWorkspaceAction(
  role: WorkspaceMemberRole,
  action: WorkspaceAction
): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[ACTION_MIN_ROLE[action]];
}

/**
 * Throws instead of returning a boolean — for call sites where "not
 * authorized" should abort the request immediately (most route handlers).
 * Kept as a separate function so pure-logic tests can use the boolean
 * version without needing to assert on a thrown error every time.
 */
export class WorkspaceAuthorizationError extends Error {
  constructor(action: WorkspaceAction, role: WorkspaceMemberRole) {
    super(`Role '${role}' is not permitted to perform '${action}'`);
    this.name = "WorkspaceAuthorizationError";
  }
}

export function requireWorkspaceAction(
  role: WorkspaceMemberRole,
  action: WorkspaceAction
): void {
  if (!authorizeWorkspaceAction(role, action)) {
    throw new WorkspaceAuthorizationError(action, role);
  }
}
