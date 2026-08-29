import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Regression guard: /robots.txt and /sitemap.xml were neither in
// PUBLIC_PATHS nor covered by any PUBLIC_PREFIXES entry, and the
// middleware matcher doesn't exclude .txt/.xml extensions — so every
// request to either was silently redirected to /login instead of
// serving real content. A search engine crawler would never see a
// valid robots.txt or sitemap.xml. Found by actually curling the built
// app's routes, not by reading the source. This guards against it
// silently regressing if PUBLIC_PATHS is ever rewritten.
describe("middleware serves well-known crawler files without redirecting to login", () => {
  const src = readFileSync(path.resolve(__dirname, "../../middleware.ts"), "utf-8");

  it("robots.txt is in PUBLIC_PATHS", () => {
    expect(src).toMatch(/"\/robots\.txt"/);
  });

  it("sitemap.xml is in PUBLIC_PATHS", () => {
    expect(src).toMatch(/"\/sitemap\.xml"/);
  });

  it("both are inside the PUBLIC_PATHS array, not just mentioned somewhere else in the file", () => {
    const arrayStart = src.indexOf("const PUBLIC_PATHS = [");
    const arrayEnd = src.indexOf("];", arrayStart);
    const arrayBody = src.slice(arrayStart, arrayEnd);
    expect(arrayBody).toMatch(/"\/robots\.txt"/);
    expect(arrayBody).toMatch(/"\/sitemap\.xml"/);
  });
});
