"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";

export async function markNotificationRead(notificationId: string) {
  const { user } = await getCurrentUserAndWorkspace();
  if (!user) return;

  const supabase = createClient();
  // .eq("user_id", user.id) is the access control here — a user can
  // only ever mark their own notifications read.
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const { user } = await getCurrentUserAndWorkspace();
  if (!user) return;

  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/dashboard");
}
