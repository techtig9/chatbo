import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// Regression guard for Phase 27's toast system (spec section 89).

describe("ToastProvider and the search-param bridge are mounted at the dashboard layout", () => {
  const src = readFileSync(path.resolve(__dirname, "../../app/dashboard/layout.tsx"), "utf-8");

  it("wraps the dashboard tree in <ToastProvider>", () => {
    expect(src).toMatch(/import \{ ToastProvider \} from "@\/components\/ui\/toast"/);
    expect(src).toMatch(/<ToastProvider>/);
  });

  it("mounts SearchParamToastBridge inside a Suspense boundary (useSearchParams requires one)", () => {
    expect(src).toMatch(/import \{ SearchParamToastBridge \} from "@\/components\/dashboard\/search-param-toast-bridge"/);
    const suspenseIndex = src.indexOf("<Suspense fallback={null}>");
    const bridgeIndex = src.indexOf("<SearchParamToastBridge");
    expect(suspenseIndex).toBeGreaterThan(-1);
    expect(bridgeIndex).toBeGreaterThan(suspenseIndex);
  });
});

describe("Agent published/unpublished/duplicated/archived surface a toast on success", () => {
  const src = readFileSync(path.resolve(__dirname, "../../components/dashboard/agent-actions-menu.tsx"), "utf-8");

  it("uses the toast system instead of window.alert for errors", () => {
    expect(src).not.toMatch(/window\.alert/);
    expect(src).toMatch(/showToast\("error", result\.error\)/);
  });

  it("passes a distinct success message for each lifecycle action", () => {
    expect(src).toMatch(/duplicateBot\(botId\), "Agent duplicated"/);
    expect(src).toMatch(/setBotPublishStatus\(botId, false\), "Agent unpublished"/);
    expect(src).toMatch(/setBotPublishStatus\(botId, true\), "Agent published"/);
    expect(src).toMatch(/status === "archived" \? "Agent unarchived" : "Agent archived"/);
  });
});

describe("The Agent Builder's own publish toggle also shows a toast, not just the dropdown menu's", () => {
  it("togglePublish calls showToast on success with a status-appropriate message", () => {
    const src = readFileSync(path.resolve(__dirname, "../../components/bot-editor/agent-builder-shell.tsx"), "utf-8");
    const fnStart = src.indexOf("async function togglePublish");
    const fnBody = src.slice(fnStart, fnStart + 400);
    expect(fnBody).toMatch(/showToast\("success", !isPublished \? "Agent published" : "Agent unpublished"\)/);
  });
});
