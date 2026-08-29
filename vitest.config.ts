import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "lib/testing/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    // e2e/*.spec.ts matches Vitest's default discovery glob but those
    // are Playwright tests (import @playwright/test, need a real
    // running server) — running them under Vitest would just fail with
    // a confusing import error, not skip gracefully.
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
