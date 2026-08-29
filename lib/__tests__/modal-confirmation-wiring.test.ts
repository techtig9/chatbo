import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Regression guard for Phase 24's modal work (spec section 86's named
// "Publish Agent" and "Tool Approval" examples). Both follow the same
// deliberate asymmetry: the consequential direction (making something
// live, approving a sensitive action) is gated behind ConfirmModal, the
// safe/reversing direction (unpublish, reject) isn't — that asymmetry is
// a design decision, not an oversight, and easy to lose silently if
// someone "simplifies" one of these handlers later without noticing the
// other one was deliberately left ungated.
function read(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "../..", relativePath), "utf-8");
}

describe("Publish Agent is gated, Unpublish is not", () => {
  const src = read("components/dashboard/agent-actions-menu.tsx");

  it("publishing opens a confirm modal instead of calling the action directly", () => {
    expect(src).toMatch(/setPublishModalOpen\(true\)/);
    const modalIndex = src.indexOf("open={publishModalOpen}");
    expect(modalIndex).toBeGreaterThan(-1);
    const modalBlock = src.slice(modalIndex, modalIndex + 500);
    expect(modalBlock).toMatch(/setBotPublishStatus\(botId, true\)/);
    expect(modalBlock).toMatch(/tone="primary"/);
  });

  it("unpublishing calls setBotPublishStatus directly, without opening any modal", () => {
    const branchStart = src.indexOf('if (status === "published")');
    const branchEnd = src.indexOf("setPublishModalOpen(true)");
    const unpublishBranch = src.slice(branchStart, branchEnd);
    expect(unpublishBranch).toMatch(/run\(\(\) => setBotPublishStatus\(botId, false\)/);
    expect(unpublishBranch).not.toMatch(/Modal/);
  });
});

describe("Tool Approval: Approve is gated, Reject is not", () => {
  const src = read("components/approvals/approval-actions.tsx");

  it("the Approve button opens a confirm modal rather than deciding immediately", () => {
    expect(src).toMatch(/onClick=\{\(\) => setApproveOpen\(true\)\}/);
  });

  it("the Reject button calls decideApproval directly, without a confirm modal", () => {
    expect(src).toMatch(/onClick=\{\(\) => startTransition\(\(\) => decideApproval\(approvalId, "rejected"/);
  });

  it("the confirm modal itself decides 'approved' with tone=\"primary\", not the danger tone", () => {
    const modalIndex = src.indexOf("<ConfirmModal");
    const modalBlock = src.slice(modalIndex, modalIndex + 500);
    expect(modalBlock).toMatch(/decideApproval\(approvalId, "approved"\)/);
    expect(modalBlock).toMatch(/tone="primary"/);
  });
});

describe("Invite Member uses the Modal primitive", () => {
  it("InviteMemberModal wraps the invite form in <Modal>, not a permanently-inline form", () => {
    const src = read("components/settings/invite-member-modal.tsx");
    expect(src).toMatch(/import \{ Modal \} from "@\/components\/ui\/modal"/);
    expect(src).toMatch(/<Modal open=\{open\}/);
  });

  it("the settings page renders InviteMemberModal instead of a bare inline form", () => {
    const src = read("app/dashboard/settings/page.tsx");
    expect(src).toMatch(/<InviteMemberModal inviteAction=\{inviteMember\} \/>/);
    expect(src).not.toMatch(/action=\{inviteMember\}/); // no leftover raw form action
  });
});
