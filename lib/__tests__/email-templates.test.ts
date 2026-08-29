import { describe, it, expect } from "vitest";
import { lowCreditWarningEmail, paymentFailedEmail, teamInviteEmail, weeklyDigestEmail, subscriptionCanceledEmail, invitationAcceptedEmail, welcomeEmail } from "@/lib/email/templates";

describe("lowCreditWarningEmail", () => {
  it("uses urgent framing and blocks-messages language at 100%", () => {
    const result = lowCreditWarningEmail({
      workspaceName: "Acme Co",
      percentUsed: 100,
      creditsRemaining: 0,
    });
    expect(result.subject).toContain("run out of credits");
    expect(result.html).toContain("blocked");
    expect(result.html).toContain("Acme Co");
  });

  it("uses softer framing and shows remaining credits at 80%", () => {
    const result = lowCreditWarningEmail({
      workspaceName: "Acme Co",
      percentUsed: 80,
      creditsRemaining: 2600,
    });
    expect(result.subject).toContain("80%");
    expect(result.html).toContain("2,600");
    expect(result.html).not.toContain("blocked");
  });

  it("includes a link to billing", () => {
    const result = lowCreditWarningEmail({
      workspaceName: "Acme Co",
      percentUsed: 80,
      creditsRemaining: 100,
    });
    expect(result.html).toContain("/dashboard/billing");
  });
});

describe("paymentFailedEmail", () => {
  it("names the workspace and links to billing", () => {
    const result = paymentFailedEmail({ workspaceName: "Acme Co" });
    expect(result.subject).toContain("Acme Co");
    expect(result.html).toContain("Acme Co");
    expect(result.html).toContain("/dashboard/billing");
  });
});

describe("teamInviteEmail", () => {
  it("includes inviter, workspace, and role", () => {
    const result = teamInviteEmail({
      workspaceName: "Acme Co",
      inviterName: "Jamie",
      role: "editor",
    });
    expect(result.subject).toContain("Jamie");
    expect(result.subject).toContain("Acme Co");
    expect(result.html).toContain("editor");
  });

  it("uses 'an' before a vowel-starting role and 'a' otherwise", () => {
    const admin = teamInviteEmail({ workspaceName: "X", inviterName: "Y", role: "admin" });
    expect(admin.html).toContain("an <strong>admin</strong>");

    const viewer = teamInviteEmail({ workspaceName: "X", inviterName: "Y", role: "viewer" });
    expect(viewer.html).toContain("a <strong>viewer</strong>");
  });

  it("links to the invites page", () => {
    const result = teamInviteEmail({ workspaceName: "X", inviterName: "Y", role: "editor" });
    expect(result.html).toContain("/dashboard/invites");
  });
});

describe("weeklyDigestEmail", () => {
  it("includes all three stats and the workspace name", () => {
    const result = weeklyDigestEmail({
      workspaceName: "Acme Co",
      conversationCount: 12,
      messageCount: 48,
      creditsRemaining: 5000,
    });
    expect(result.html).toContain("Acme Co");
    expect(result.html).toContain("12 conversation");
    expect(result.html).toContain("48 message");
    expect(result.html).toContain("5,000");
  });

  it("uses singular phrasing for exactly 1 conversation/message", () => {
    const result = weeklyDigestEmail({
      workspaceName: "X",
      conversationCount: 1,
      messageCount: 1,
      creditsRemaining: 100,
    });
    expect(result.subject).toContain("1 conversation");
    expect(result.subject).not.toContain("1 conversations");
    expect(result.html).toContain("1 message ");
    expect(result.html).not.toContain("1 messages");
  });

  it("uses plural phrasing for 0 (grammatically, 0 takes plural)", () => {
    const result = weeklyDigestEmail({
      workspaceName: "X",
      conversationCount: 0,
      messageCount: 0,
      creditsRemaining: 0,
    });
    expect(result.subject).toContain("0 conversations");
  });

  it("links to conversations", () => {
    const result = weeklyDigestEmail({
      workspaceName: "X",
      conversationCount: 1,
      messageCount: 1,
      creditsRemaining: 1,
    });
    expect(result.html).toContain("/dashboard/conversations");
  });
});

describe("subscriptionCanceledEmail", () => {
  it("mentions continued access until the given date", () => {
    const result = subscriptionCanceledEmail({ workspaceName: "Acme Co", accessUntil: "2026-09-19T00:00:00Z" });
    expect(result.subject).toContain("canceled");
    expect(result.html).toContain("Acme Co");
    expect(result.html).toContain("9/19/2026");
  });

  it("falls back to generic end-of-period language when no date is known", () => {
    const result = subscriptionCanceledEmail({ workspaceName: "Acme Co", accessUntil: null });
    expect(result.html).toContain("end of the current billing period");
  });
});

describe("invitationAcceptedEmail", () => {
  it("names the member and workspace", () => {
    const result = invitationAcceptedEmail({ workspaceName: "Acme Co", memberEmail: "new@acme.com" });
    expect(result.subject).toContain("new@acme.com");
    expect(result.html).toContain("Acme Co");
    expect(result.html).toContain("new@acme.com");
  });
});

describe("welcomeEmail", () => {
  it("greets by name when available", () => {
    const result = welcomeEmail({ name: "Sam", workspaceName: "Acme Co" });
    expect(result.html).toContain("Hi Sam");
    expect(result.html).toContain("Acme Co");
  });

  it("omits the name gracefully when unavailable", () => {
    const result = welcomeEmail({ name: null, workspaceName: "Acme Co" });
    expect(result.html).toContain("Hi,");
    expect(result.html).not.toContain("Hi null");
  });
});
