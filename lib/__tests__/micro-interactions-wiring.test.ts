import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Regression guard for Phase 29's micro-interaction fixes (spec section 91).
function read(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "../..", relativePath), "utf-8");
}

describe("Webhook signing secret is actually shown to the user (copy confirmation)", () => {
  it("createWebhookEndpoint returns the secret instead of only redirecting", () => {
    const src = read("lib/actions/webhooks.ts");
    const fnStart = src.indexOf("export async function createWebhookEndpoint");
    const fnEnd = src.indexOf("export async function deleteWebhookEndpoint");
    const fnBody = src.slice(fnStart, fnEnd);
    expect(fnBody).toMatch(/return \{ success: true, secret \}/);
    // The secret is generated once and never re-selected elsewhere —
    // this is the one and only place it should ever leave the server.
    expect(fnBody).toMatch(/const secret = generateWebhookSecret\(\)/);
  });

  it("the create-webhook form reveals the secret in a modal with a copy button, not inline permanently", () => {
    const src = read("components/webhooks/create-webhook-form.tsx");
    expect(src).toMatch(/<Modal open=\{secret !== null\}/);
    expect(src).toMatch(/navigator\.clipboard\.writeText\(secret\)/);
    expect(src).toMatch(/won&rsquo;t be shown again/);
  });

  it("the webhooks page renders the client form instead of the old raw inline form", () => {
    const src = read("app/dashboard/settings/webhooks/page.tsx");
    expect(src).toMatch(/<CreateWebhookForm \/>/);
    expect(src).not.toMatch(/action=\{createWebhookEndpoint\}/);
  });
});

describe("Agent Builder's Save changes button shows save status (spec section 91)", () => {
  it("uses SubmitButton (useFormStatus-driven loading) instead of a static Button", () => {
    const src = read("components/bot-editor/agent-builder-shell.tsx");
    expect(src).toMatch(/<SubmitButton variant="primary" className="mt-6">Save changes<\/SubmitButton>/);
  });
});
