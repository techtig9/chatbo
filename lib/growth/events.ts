import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function recordGrowthEvent(input: { workspaceId: string; userId?: string; event: string; path?: string; metadata?: Record<string, unknown> }) {
  const supabase = createClient();
  const client = supabase as unknown as { from: (table: string) => any };
  await client.from("growth_events").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId ?? null,
    event: input.event,
    path: input.path ?? null,
    metadata: input.metadata ?? {},
  });
}
