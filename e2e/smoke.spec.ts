import { test, expect } from "@playwright/test";
import { generateTestEmail, confirmTestUserEmail, deleteTestUser } from "./helpers";

const TEST_PASSWORD = "E2eTest1Password!";

test.describe("smoke: signup → create bot → publish → widget round trip", () => {
  let testUserId: string | null = null;

  test.afterEach(async () => {
    if (testUserId) {
      await deleteTestUser(testUserId).catch((err) => {
        console.error("Test cleanup failed:", err);
      });
    }
  });

  test("full journey", async ({ page }) => {
    const email = generateTestEmail();

    // --- Sign up ---
    await page.goto("/signup");
    await page.getByLabel("Name").fill("E2E Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: false }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    // Real signup requires email confirmation — confirm it out of band
    // via the service role key rather than clicking a link, since
    // there's no real inbox to check in CI.
    await expect(page).toHaveURL(/\/login/);
    testUserId = await confirmTestUserEmail(email);

    // --- Log in ---
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // --- Create a bot (real Claude API call) ---
    await page.goto("/dashboard/bots/new");
    await page.getByLabel("Bot name").fill("E2E Test Bot");
    await page.getByRole("button", { name: "Generate bot" }).click();

    await expect(page).toHaveURL(/\/dashboard\/bots\/[^/]+\/edit/, { timeout: 30_000 });
    const botId = page.url().match(/\/bots\/([^/]+)\/edit/)?.[1];
    expect(botId).toBeTruthy();

    // --- Publish it ---
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published")).toBeVisible();

    // --- Widget round trip ---
    await page.goto(`/widget/${botId}`);
    await page.getByPlaceholder("Type a message…").fill("Hello, are you there?");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByPlaceholder("Type a message…")).toBeEnabled({ timeout: 20_000 });
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});
