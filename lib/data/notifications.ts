import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function listRecentNotifications(
  userId: string,
  limit: number = 10
): Promise<{ notifications: NotificationRow[]; unreadCount: number }> {
  const supabase = createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  return {
    notifications: (notifications ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
    unreadCount: unreadCount ?? 0,
  };
}
