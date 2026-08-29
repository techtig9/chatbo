import { describe, it, expect } from "vitest";
import {
  authorizeWorkspaceAction,
  requireWorkspaceAction,
  WorkspaceAuthorizationError,
} from "@/lib/authz/rbac";

describe("authorizeWorkspaceAction", () => {
  it("lets a viewer read conversations and analytics", () => {
    expect(authorizeWorkspaceAction("viewer", "conversation:read")).toBe(true);
    expect(authorizeWorkspaceAction("viewer", "analytics:read")).toBe(true);
  });

  it("blocks a viewer from editing or deleting a bot", () => {
    expect(authorizeWorkspaceAction("viewer", "bot:edit")).toBe(false);
    expect(authorizeWorkspaceAction("viewer", "bot:delete")).toBe(false);
  });

  it("lets an editor create and publish bots but not delete them", () => {
    expect(authorizeWorkspaceAction("editor", "bot:create")).toBe(true);
    expect(authorizeWorkspaceAction("editor", "bot:publish")).toBe(true);
    expect(authorizeWorkspaceAction("editor", "bot:delete")).toBe(false);
  });

  it("blocks an editor from managing members or billing", () => {
    expect(authorizeWorkspaceAction("editor", "member:invite")).toBe(false);
    expect(authorizeWorkspaceAction("editor", "billing:manage")).toBe(false);
  });

  it("lets an admin manage members, api keys, webhooks, and audit logs", () => {
    expect(authorizeWorkspaceAction("admin", "member:invite")).toBe(true);
    expect(authorizeWorkspaceAction("admin", "apikey:manage")).toBe(true);
    expect(authorizeWorkspaceAction("admin", "webhook:manage")).toBe(true);
    expect(authorizeWorkspaceAction("admin", "audit:read")).toBe(true);
  });

  it("blocks an admin from billing:manage and workspace:delete — owner only", () => {
    expect(authorizeWorkspaceAction("admin", "billing:manage")).toBe(false);
    expect(authorizeWorkspaceAction("admin", "workspace:delete")).toBe(false);
  });

  it("lets an owner do everything", () => {
    const allActions = [
      "bot:create", "bot:edit", "bot:delete", "bot:publish", "knowledge:manage",
      "conversation:read", "member:invite", "member:remove", "member:changeRole",
      "billing:manage", "billing:read", "workspace:delete", "apikey:manage",
      "webhook:manage", "audit:read", "analytics:read",
    ] as const;
    for (const action of allActions) {
      expect(authorizeWorkspaceAction("owner", action)).toBe(true);
    }
  });

  it("is strictly hierarchical — every role can do everything the roles below it can", () => {
    const roles = ["viewer", "editor", "admin", "owner"] as const;
    const actions = [
      "bot:create", "bot:delete", "member:invite", "billing:manage",
    ] as const;

    for (const action of actions) {
      let seenTrue = false;
      for (const role of roles) {
        const allowed = authorizeWorkspaceAction(role, action);
        if (allowed) seenTrue = true;
        // Once a role is allowed, every higher role must also be allowed —
        // this catches an accidental non-monotonic entry in ACTION_MIN_ROLE.
        if (seenTrue) expect(allowed).toBe(true);
      }
    }
  });
});

describe("requireWorkspaceAction", () => {
  it("does not throw when the role is sufficient", () => {
    expect(() => requireWorkspaceAction("owner", "billing:manage")).not.toThrow();
  });

  it("throws WorkspaceAuthorizationError when the role is insufficient", () => {
    expect(() => requireWorkspaceAction("viewer", "bot:delete")).toThrow(
      WorkspaceAuthorizationError
    );
  });

  it("includes the role and action in the error message for debuggability", () => {
    try {
      requireWorkspaceAction("editor", "billing:manage");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(WorkspaceAuthorizationError);
      expect((err as Error).message).toContain("editor");
      expect((err as Error).message).toContain("billing:manage");
    }
  });
});
