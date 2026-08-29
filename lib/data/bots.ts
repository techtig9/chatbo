import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type BotRow = Database["public"]["Tables"]["bots"]["Row"];

export async function listBotsForWorkspace(workspaceId: string): Promise<BotRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load bots: ${error.message}`);
  }

  return data ?? [];
}

export async function getBotById(botId: string): Promise<BotRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .eq("id", botId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load bot: ${error.message}`);
  }

  return data;
}
