import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import { NextRequest } from "next/server";

// Records every insert/update issued against each table so tests can assert
// on call counts (e.g. "reset_monthly_credits only ran once" for a
// redelivered event) without a real Supabase instance.
function makeSupabaseMock() {
  const inserted: Record<string, any[]> = {};
  const insertResults: Record<string, { data: unknown; error: { code: string; message: string } | null }> = {};
  const rpcCalls: { name: string; args: unknown }[] = [];

  const table: any = {
    insert: vi.fn((row: any) => {
      const tableName = table.__name;
      inserted[tableName] ??= [];
      const result = insertResults[tableName];
      if (result?.error) return Promise.resolve(result);
      inserted[tableName].push(row);
      return Promise.resolve({ data: row, error: null });
    }),
    update: vi.fn(() => table),
    eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };

  return {
    from: vi.fn((name: string) => { table.__name = name; return table; }),
    rpc: vi.fn((name: string, args: unknown) => { rpcCalls.push({ name, args }); return Promise.resolve({ data: null, error: null }); }),
    __inserted: inserted,
    __rpcCalls: rpcCalls,
    __table: table,
    __setInsertError: (tableName: string, code: string, message: string) => { insertResults[tableName] = { data: null, error: { code, message } }; },
  };
}

let supabaseMock = makeSupabaseMock();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));
vi.mock("@/lib/notifications/workspace-owner", () => ({
  getWorkspaceOwner: vi.fn(async () => null),
}));
vi.mock("@/lib/notifications/create", () => ({
  createNotification: vi.fn(async () => {}),
}));
vi.mock("@/lib/email/resend", () => ({
  sendEmail: vi.fn(async () => {}),
}));

const SECRET = "whsec_test_secret";

function sign(ts: string, rawBody: string, key: string): string {
  const hash = createHmac("sha256", key).update(`${ts}:${rawBody}`).digest("hex");
  return `ts=${ts};h1=${hash}`;
}

function makeRequest(body: string) {
  const header = sign("1700000000", body, SECRET);
  return new NextRequest("https://chatbo.ai/api/webhooks/paddle", {
    method: "POST",
    headers: { "paddle-signature": header, "content-type": "application/json" },
    body,
  });
}

const subscriptionUpdatedPayload = JSON.stringify({
  event_id: "evt_dup_test_1",
  event_type: "subscription.updated",
  data: {
    id: "sub_123",
    customer_id: "ctm_123",
    status: "active",
    next_billed_at: "2026-09-19T00:00:00Z",
    items: [{ price: { id: "pri_starter_123" } }],
    custom_data: { workspaceId: "ws_123" },
  },
});

describe("Paddle webhook route", () => {
  beforeEach(() => {
    process.env.PADDLE_WEBHOOK_SECRET = SECRET;
    process.env.PADDLE_PRICE_ID_STARTER = "pri_starter_123";
    supabaseMock = makeSupabaseMock();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("rejects a request with an invalid signature before touching the database", async () => {
    const { POST } = await import("@/app/api/webhooks/paddle/route");
    const body = subscriptionUpdatedPayload;
    const request = new NextRequest("https://chatbo.ai/api/webhooks/paddle", {
      method: "POST",
      headers: { "paddle-signature": "ts=1700000000;h1=deadbeef", "content-type": "application/json" },
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("processes a new subscription.updated event exactly once", async () => {
    const { POST } = await import("@/app/api/webhooks/paddle/route");
    const response = await POST(makeRequest(subscriptionUpdatedPayload));

    expect(response.status).toBe(200);
    expect(supabaseMock.__inserted.paddle_webhook_events).toHaveLength(1);
    expect(supabaseMock.__inserted.paddle_webhook_events?.[0].event_id).toBe("evt_dup_test_1");
    expect(supabaseMock.__rpcCalls.filter((c) => c.name === "reset_monthly_credits")).toHaveLength(1);
  });

  it("7. does not re-apply a redelivered (duplicate) webhook event", async () => {
    // Simulate the event already having been recorded by a prior delivery.
    supabaseMock.__setInsertError("paddle_webhook_events", "23505", "duplicate key value violates unique constraint");
    const { POST } = await import("@/app/api/webhooks/paddle/route");

    const response = await POST(makeRequest(subscriptionUpdatedPayload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.duplicate).toBe(true);
    // The whole point: a redelivered subscription.updated must NOT reset
    // credits a second time.
    expect(supabaseMock.__rpcCalls.filter((c) => c.name === "reset_monthly_credits")).toHaveLength(0);
    expect(supabaseMock.__table.update).not.toHaveBeenCalled();
  });
});
