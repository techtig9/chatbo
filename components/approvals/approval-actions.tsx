"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { decideApproval } from "@/lib/actions/approvals";
import { ConfirmModal } from "@/components/ui/confirm-modal";

/**
 * "Tool Approval" — spec section 86's named example. Approving is the
 * consequential direction (a real, potentially sensitive agent action
 * actually executes once approved), so it gets the confirm-modal gate;
 * rejecting is the conservative/safe choice and stays a single click,
 * same asymmetry as Publish vs Unpublish on the agent actions menu.
 */
export function ApprovalActions({ approvalId, title }: { approvalId: string; title: string }) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setApproveOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
      >
        <CheckCircle2 size={16} aria-hidden="true" /> Approve
      </button>
      <button
        type="button"
        onClick={() => startTransition(() => decideApproval(approvalId, "rejected", "Rejected from Approval Center"))}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-danger/30 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        <XCircle size={16} aria-hidden="true" /> Reject
      </button>
      <ConfirmModal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={() => { setApproveOpen(false); startTransition(() => decideApproval(approvalId, "approved")); }}
        title="Approve this action?"
        message={`"${title}" will execute immediately once approved — this is the specific action a human was asked to review before it reaches customers or external systems.`}
        confirmLabel="Approve"
        tone="primary"
        pending={pending}
      />
    </div>
  );
}
