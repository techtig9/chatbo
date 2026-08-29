import "server-only";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/tools/integration-config";
import { getIntegrationProvider, providerEnv } from "./catalog";
import { logAuditEvent } from "@/lib/audit/log";

function sha256(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }
function randomState() { return crypto.randomBytes(32).toString("base64url"); }

export async function createOAuthStart(workspaceId: string, providerKey: string, redirectUri: string) {
  const provider = getIntegrationProvider(providerKey);
  if (!provider || provider.auth !== "oauth2") throw new Error("Unsupported integration provider");
  const clientId = providerEnv(provider, "CLIENT_ID");
  if (!clientId) throw new Error(`${provider.name} OAuth is not configured`);
  const authorizationUrl = provider.authorizationUrl ?? providerEnv(provider, "AUTHORIZATION_URL");
  if (!authorizationUrl) throw new Error(`${provider.name} authorization URL is not configured`);
  const state = randomState();
  const supabase = createClient();
  const { error } = await (supabase as any).from("integration_oauth_states").insert({ workspace_id: workspaceId, provider: provider.key, state_hash: sha256(state), redirect_uri: redirectUri, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  if (error) throw error;
  const url = new URL(authorizationUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  if (provider.scopes.length) url.searchParams.set("scope", provider.scopes.join(" "));
  return url.toString();
}

export async function completeOAuth(state: string, code: string) {
  const supabase = createClient();
  const { data: oauthState, error } = await (supabase as any).from("integration_oauth_states").select("*").eq("state_hash", sha256(state)).is("used_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw error;
  if (!oauthState) throw new Error("OAuth state is invalid or expired");
  const provider = getIntegrationProvider(oauthState.provider);
  if (!provider) throw new Error("Unknown provider");
  const clientId = providerEnv(provider, "CLIENT_ID");
  const clientSecret = providerEnv(provider, "CLIENT_SECRET");
  const tokenUrl = provider.tokenUrl ?? providerEnv(provider, "TOKEN_URL");
  if (!clientId || !clientSecret || !tokenUrl) throw new Error(`${provider.name} OAuth is not fully configured`);
  const response = await fetch(tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId, client_secret: clientSecret, redirect_uri: oauthState.redirect_uri }).toString(), cache: "no-store" });
  if (!response.ok) throw new Error(`OAuth token exchange failed (${response.status})`);
  const token = await response.json() as Record<string, unknown>;
  const accessToken = typeof token.access_token === "string" ? token.access_token : "";
  if (!accessToken) throw new Error("OAuth provider did not return an access token");
  const refreshToken = typeof token.refresh_token === "string" ? token.refresh_token : null;
  const expiresIn = typeof token.expires_in === "number" ? token.expires_in : null;
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  const accountId = typeof token.account_id === "string" ? token.account_id : typeof token.bot_user_id === "string" ? token.bot_user_id : null;
  const { data: connection, error: connectionError } = await (supabase as any).from("integration_connections").upsert({ workspace_id: oauthState.workspace_id, provider: provider.key, status: "connected", encrypted_access_token: encryptSecret(accessToken), encrypted_refresh_token: refreshToken ? encryptSecret(refreshToken) : null, expires_at: expiresAt, account_id: accountId, scopes: Array.isArray(token.scope) ? token.scope : provider.scopes, metadata: { token_type: token.token_type ?? "Bearer" }, last_error: null }, { onConflict: "workspace_id,provider" }).select("id,provider,status,account_id,expires_at,scopes,created_at,updated_at").single();
  if (connectionError) throw connectionError;
  await (supabase as any).from("integration_oauth_states").update({ used_at: new Date().toISOString() }).eq("id", oauthState.id);
  // "integration connected" for the dashboard activity feed (spec section
  // 68). No user_id on integration_oauth_states to attribute this to a
  // specific member — logged at workspace level, same as other
  // system/webhook-originated events.
  await logAuditEvent({ workspaceId: oauthState.workspace_id, actorUserId: null, action: "integration.connected", targetType: "integration_connection", targetId: connection.id, metadata: { provider: provider.key } });
  return connection;
}
