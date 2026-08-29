import "server-only";

export interface SubscriptionManagementUrls {
  updatePaymentMethod: string | null;
  cancel: string | null;
}

function paddleApiBase(): string {
  return process.env.PADDLE_ENVIRONMENT === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
}

/**
 * Paddle's own hosted pages for changing payment method / cancelling —
 * "Paddle controls the actual subscription lifecycle" (spec section 80),
 * so this never builds a custom cancel or plan-change flow, only
 * surfaces the URLs Paddle's API already returns on the subscription
 * object. Returns nulls (never throws) when PADDLE_API_KEY isn't
 * configured or the request fails — the billing page falls back to a
 * plain-text notice rather than a broken button in that case.
 */
export async function getSubscriptionManagementUrls(subscriptionId: string): Promise<SubscriptionManagementUrls> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return { updatePaymentMethod: null, cancel: null };

  try {
    const response = await fetch(`${paddleApiBase()}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`[paddle-api] subscription lookup returned ${response.status}`);
      return { updatePaymentMethod: null, cancel: null };
    }
    const json = await response.json();
    const urls = json?.data?.management_urls;
    return {
      updatePaymentMethod: typeof urls?.update_payment_method === "string" ? urls.update_payment_method : null,
      cancel: typeof urls?.cancel === "string" ? urls.cancel : null,
    };
  } catch (err) {
    console.error("[paddle-api] failed to fetch subscription management URLs", err);
    return { updatePaymentMethod: null, cancel: null };
  }
}
