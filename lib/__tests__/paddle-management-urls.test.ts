import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalApiKey = process.env.PADDLE_API_KEY;

describe("getSubscriptionManagementUrls", () => {
  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.PADDLE_API_KEY;
    else process.env.PADDLE_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
  });

  it("returns nulls without ever calling fetch when PADDLE_API_KEY isn't configured", async () => {
    delete process.env.PADDLE_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { getSubscriptionManagementUrls } = await import("@/lib/billing/paddle-api");
    const result = await getSubscriptionManagementUrls("sub_123");

    expect(result).toEqual({ updatePaymentMethod: null, cancel: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("extracts both management URLs from a successful Paddle API response", async () => {
    process.env.PADDLE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { management_urls: { update_payment_method: "https://paddle.example/update", cancel: "https://paddle.example/cancel" } } }),
    })));

    const { getSubscriptionManagementUrls } = await import("@/lib/billing/paddle-api");
    const result = await getSubscriptionManagementUrls("sub_123");
    expect(result).toEqual({ updatePaymentMethod: "https://paddle.example/update", cancel: "https://paddle.example/cancel" });
  });

  it("returns nulls (never throws) when Paddle responds with an error status", async () => {
    process.env.PADDLE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 })));

    const { getSubscriptionManagementUrls } = await import("@/lib/billing/paddle-api");
    await expect(getSubscriptionManagementUrls("sub_missing")).resolves.toEqual({ updatePaymentMethod: null, cancel: null });
  });

  it("returns nulls (never throws) when the fetch itself rejects", async () => {
    process.env.PADDLE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));

    const { getSubscriptionManagementUrls } = await import("@/lib/billing/paddle-api");
    await expect(getSubscriptionManagementUrls("sub_123")).resolves.toEqual({ updatePaymentMethod: null, cancel: null });
  });
});
