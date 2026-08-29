import { defineConfig, devices } from "@playwright/test";

/**
 * Requires a real running instance (npm run dev or a deployed preview)
 * plus real Supabase/Anthropic/Voyage credentials behind it — this
 * can't run against mocks, since the whole point of a smoke test is
 * exercising the real signup → bot creation → publish → widget pipeline
 * end to end. See e2e/README.md for the environment this needs.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // the smoke test is one linear user journey, not independent cases
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000, // bot creation involves a real Claude API call — give it room
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined // testing against an already-running deploy (CI preview URL)
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
