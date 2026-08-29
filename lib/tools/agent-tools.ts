import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getToolDefinition } from "./registry";

export async function getEnabledToolDefinitions(botId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("agent_tools").select("tool_key, enabled").eq("bot_id", botId).eq("enabled", true);
  const keys = new Set((data ?? []).map(row => row.tool_key));
  return (data ?? []).map(row => getToolDefinition(row.tool_key)).filter((tool): tool is NonNullable<typeof tool> => Boolean(tool && keys.has(tool.key)));
}
