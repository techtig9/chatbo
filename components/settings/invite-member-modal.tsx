"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * "Invite Member" — spec section 86's named example. Was a permanently
 * inline form at the top of the settings page; a modal keeps the
 * member-list page uncluttered until someone actually wants to invite,
 * matching the spec's explicit pattern list.
 */
export function InviteMemberModal({ inviteAction }: { inviteAction: (formData: FormData) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
      >
        <UserPlus size={15} aria-hidden="true" /> Invite member
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Invite a team member">
        <form action={inviteAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink">
            Invite by email
            <input
              type="email"
              name="email"
              required
              placeholder="teammate@company.com"
              className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm outline-none focus:border-signal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink">
            Role
            <select name="role" defaultValue="editor" className="bg-surface text-ink rounded-lg border border-mist px-3 py-2 text-sm">
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <p className="text-xs text-slate">Invites only work for people who already have a chatbo.ai account — ask them to sign up first if they don&rsquo;t yet.</p>
          <div className="mt-1 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate hover:bg-elevated hover:text-ink">
              Cancel
            </button>
            <SubmitButton variant="primary">Send invite</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
