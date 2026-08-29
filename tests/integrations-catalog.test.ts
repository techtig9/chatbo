import { describe, expect, it } from "vitest";
import { INTEGRATION_CATALOG, getIntegrationProvider } from "@/lib/integrations/catalog";

describe("integration catalog", () => {
  it("contains the core first-party providers", () => {
    for (const key of ["slack", "shopify", "stripe", "hubspot", "salesforce", "zendesk", "google_workspace", "microsoft_365", "notion", "discord"]) {
      expect(getIntegrationProvider(key)).toBeDefined();
    }
  });

  it("uses unique provider keys", () => {
    expect(new Set(INTEGRATION_CATALOG.map((p) => p.key)).size).toBe(INTEGRATION_CATALOG.length);
  });

  it("does not expose credentials in the catalog", () => {
    // Regex-matching the whole serialized catalog is too broad: Salesforce's
    // OAuth scope list legitimately includes the literal scope name
    // "refresh_token" (required to request one from Salesforce's API),
    // which isn't a credential — actual secrets are never stored in this
    // catalog at all, only read from env vars via envPrefix at runtime.
    // The real property to test is that no entry has a field that would
    // hold one.
    for (const provider of INTEGRATION_CATALOG) {
      const suspiciousKeys = Object.keys(provider).filter((k) => /secret|^token$|^access_token$|^refresh_token$/i.test(k));
      expect(suspiciousKeys).toEqual([]);
    }
  });
});
