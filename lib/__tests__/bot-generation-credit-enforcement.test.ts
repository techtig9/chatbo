import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// synthesizeBotPrompt is a real AI gateway call (Groq/Cerebras/OpenRouter/
// Claude). CREDIT_COSTS.promptRegeneration exists specifically to meter it,
// but neither entry point that calls it (the dashboard "create bot" action,
// the public v1 API) ever checked or deducted credits — bot creation was
// free, unmetered AI usage. Fixed by adding canAffordAction +
// spendCreditsAtomic("promptRegeneration") around both call sites; this
// test guards against either one losing that check again, since the
// mocking cost of a full server-action/route-handler integration test here
// is high relative to what a source check catches just as reliably.
describe("bot-generation credit enforcement stays wired up", () => {
  const root = path.resolve(__dirname, "../..");

  function read(relativePath: string): string {
    return readFileSync(path.join(root, relativePath), "utf-8");
  }

  it("lib/actions/bots.ts checks and spends promptRegeneration credits around synthesizeBotPrompt", () => {
    const src = read("lib/actions/bots.ts");
    const synthesisCallIndex = src.indexOf("synthesizeBotPrompt({");
    expect(synthesisCallIndex).toBeGreaterThan(-1);

    const before = src.slice(0, synthesisCallIndex);
    const after = src.slice(synthesisCallIndex);
    expect(before).toMatch(/canAffordAction\([^)]*"promptRegeneration"/);
    expect(after).toMatch(/spendCreditsAtomic\([^)]*"promptRegeneration"/);
  });

  it("app/api/v1/bots/route.ts checks and spends promptRegeneration credits around synthesizeBotPrompt", () => {
    const src = read("app/api/v1/bots/route.ts");
    const synthesisCallIndex = src.indexOf("synthesizeBotPrompt({");
    expect(synthesisCallIndex).toBeGreaterThan(-1);

    const before = src.slice(0, synthesisCallIndex);
    const after = src.slice(synthesisCallIndex);
    expect(before).toMatch(/canAffordAction\([^)]*"promptRegeneration"/);
    expect(after).toMatch(/spendCreditsAtomic\([^)]*"promptRegeneration"/);
  });
});
