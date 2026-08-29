import "server-only";

interface GoTrueFactor {
  id: string;
  factor_type: string;
  status: "verified" | "unverified";
}

function getAdminApiConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return {
    baseUrl: `${url}/auth/v1/admin`,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  };
}

/** Lists a user's MFA factors via the admin API. */
export async function listUserTotpFactors(userId: string): Promise<GoTrueFactor[]> {
  const { baseUrl, headers } = getAdminApiConfig();
  const response = await fetch(`${baseUrl}/users/${userId}`, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch user factors (${response.status})`);
  }

  const user = (await response.json()) as { factors?: GoTrueFactor[] };
  return (user.factors ?? []).filter((f) => f.factor_type === "totp");
}

/**
 * Deletes a single MFA factor via the admin API — this is what makes
 * recovery-code-based reset safe: it's a privileged server-side
 * operation using the service role key, not something the user's own
 * (aal1, unverified) session could do on its own even if it wanted to.
 */
export async function deleteUserFactor(userId: string, factorId: string): Promise<void> {
  const { baseUrl, headers } = getAdminApiConfig();
  const response = await fetch(`${baseUrl}/users/${userId}/factors/${factorId}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete MFA factor (${response.status})`);
  }
}

/** Deletes every TOTP factor for a user — used by the recovery flow. */
export async function deleteAllUserTotpFactors(userId: string): Promise<number> {
  const factors = await listUserTotpFactors(userId);
  await Promise.all(factors.map((f) => deleteUserFactor(userId, f.id)));
  return factors.length;
}
