"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import type { Plan } from "@/lib/supabase/types";

const VALID_PLANS: Plan[] = ["free", "starter", "pro", "business"];

export async function overrideSubscription(subscriptionId: string, formData: FormData) {
  const { user } = await getCurrentUserAndWorkspace();

  // Checked here too, not just in the /admin layout — a server action
  // is a real network-reachable endpoint on its own, and this file
  // should be safe to reason about without trusting every caller
  // already went through the layout.
  if (!user || !user.isPlatformAdmin) {
    redirect("/dashboard");
  }

  const plan = formData.get("plan");
  const creditsRemaining = formData.get("creditsRemaining");

  if (typeof plan !== "string" || !VALID_PLANS.includes(plan as Plan)) {
    redirect("/admin/subscriptions?error=Invalid+plan");
  }

  const credits = Number(creditsRemaining);
  if (!Number.isFinite(credits) || credits < 0) {
    redirect("/admin/subscriptions?error=Invalid+credit+amount");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ plan: plan as Plan, credits_remaining: credits })
    .eq("id", subscriptionId);

  if (error) {
    redirect(`/admin/subscriptions?error=${encodeURIComponent("Update failed")}`);
  }

  revalidatePath("/admin/subscriptions");
  redirect("/admin/subscriptions?success=Updated");
}
