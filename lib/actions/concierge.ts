"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { seedConciergeBot } from "@/lib/concierge/seed";
import { getRequestOrigin } from "@/lib/utils/origin";

export async function runConciergeSeed() {
  const { user } = await getCurrentUserAndWorkspace();
  if (!user || !user.isPlatformAdmin) {
    redirect("/dashboard");
  }

  const helpCenterUrl = `${getRequestOrigin()}/help`;

  let result;
  try {
    result = await seedConciergeBot(user.id, helpCenterUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed";
    redirect(`/admin?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin");
  redirect(
    `/admin?success=${encodeURIComponent(
      `Concierge bot ${result.wasCreated ? "created" : "refreshed"} — bot id ${result.botId}`
    )}`
  );
}
