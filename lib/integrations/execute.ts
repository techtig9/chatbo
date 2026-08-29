import "server-only";
import { decryptSecret } from "@/lib/tools/integration-config";
import { createClient } from "@/lib/supabase/server";

const ACTIONS: Record<string, { provider: string; permission: "read" | "write" | "sensitive" }> = {
  send_message: { provider: "slack", permission: "write" },
  get_customer: { provider: "stripe", permission: "read" },
  find_contact: { provider: "hubspot", permission: "read" },
  create_ticket: { provider: "zendesk", permission: "write" },
};

export async function executeIntegrationAction(input: { workspaceId:string; botId:string; connectionId:string; action:string; payload:Record<string, unknown> }) {
  const definition = ACTIONS[input.action];
  if (!definition) throw new Error("Integration action is not available");
  const supabase = createClient();
  const { data: connection, error } = await (supabase as any).from("integration_connections").select("*").eq("id", input.connectionId).eq("workspace_id", input.workspaceId).eq("status", "connected").maybeSingle();
  if (error) throw error;
  if (!connection || connection.provider !== definition.provider) throw new Error("Integration connection is not authorized for this action");
  const { data: permission } = await (supabase as any).from("agent_integration_permissions").select("enabled,scopes").eq("bot_id", input.botId).eq("connection_id", input.connectionId).maybeSingle();
  if (!permission?.enabled) throw new Error("This agent has not been granted access to the integration");
  const token = connection.encrypted_access_token ? decryptSecret(connection.encrypted_access_token) : null;
  if (!token) throw new Error("Integration credential is unavailable; reconnect the integration");

  let result: unknown;
  if (input.action === "send_message") {
    if (typeof input.payload.channel !== "string" || typeof input.payload.text !== "string") throw new Error("channel and text are required");
    const response = await fetch("https://slack.com/api/chat.postMessage", { method:"POST", headers:{ authorization:`Bearer ${token}`, "content-type":"application/json" }, body:JSON.stringify({ channel:input.payload.channel, text:input.payload.text }), cache:"no-store" });
    const data = await response.json();
    if (!response.ok || data.ok !== true) throw new Error(data.error ?? `Slack request failed (${response.status})`);
    result = { ok:true, channel:data.channel, timestamp:data.ts };
  } else if (input.action === "get_customer") {
    if (typeof input.payload.customer_id !== "string") throw new Error("customer_id is required");
    const response = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(input.payload.customer_id)}`, { headers:{ authorization:`Bearer ${token}` }, cache:"no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message ?? `Stripe request failed (${response.status})`);
    result = data;
  } else if (input.action === "find_contact") {
    if (typeof input.payload.email !== "string") throw new Error("email is required");
    const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", { method:"POST", headers:{ authorization:`Bearer ${token}`, "content-type":"application/json" }, body:JSON.stringify({ filterGroups:[{ filters:[{ propertyName:"email", operator:"EQ", value:input.payload.email }] }], properties:["email","firstname","lastname","phone"] }), cache:"no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message ?? `HubSpot request failed (${response.status})`);
    result = data;
  } else if (input.action === "create_ticket") {
    if (typeof input.payload.subject !== "string" || typeof input.payload.description !== "string") throw new Error("subject and description are required");
    const subdomain = typeof connection.metadata?.subdomain === "string" ? connection.metadata.subdomain : null;
    if (!subdomain) throw new Error("Zendesk subdomain is missing from the connection metadata");
    const response = await fetch(`https://${subdomain}.zendesk.com/api/v2/tickets.json`, { method:"POST", headers:{ authorization:`Bearer ${token}`, "content-type":"application/json" }, body:JSON.stringify({ ticket:{ subject:input.payload.subject, comment:{body:input.payload.description} } }), cache:"no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error ?? `Zendesk request failed (${response.status})`);
    result = data;
  }
  await (supabase as any).from("integration_connections").update({ last_used_at:new Date().toISOString(), last_error:null }).eq("id", input.connectionId);
  return result;
}
