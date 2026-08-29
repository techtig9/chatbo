import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
  });
  if (error) {
    console.error(`Failed to create notification "${params.type}":`, error.message);
  }
}
