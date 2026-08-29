"use client";

import { GitBranch } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

/** "No workflows → Create workflow" (spec section 87's named example).
 * The create form already sits at the top of the page — the primary
 * action here focuses it rather than duplicating a second form. */
export function EmptyWorkflowsState() {
  return (
    <EmptyState
      icon={GitBranch}
      title="No workflows yet"
      description="Chain agents, knowledge lookups, tools, conditions, and human approvals on a visual canvas."
      action={
        <Button variant="primary" size="md" onClick={() => document.getElementById("new-workflow-name")?.focus()}>
          Create workflow
        </Button>
      }
    />
  );
}
