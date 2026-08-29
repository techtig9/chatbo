import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { countGrantedPermissions } from "@/lib/data/integrations";

describe("countGrantedPermissions", () => {
  it("counts only enabled permission rows, not revoked ones", () => {
    const counts = countGrantedPermissions([
      { connection_id: "c1", enabled: true },
      { connection_id: "c1", enabled: true },
      { connection_id: "c1", enabled: false }, // revoked — must not count
    ]);
    expect(counts.get("c1")).toBe(2);
  });

  it("keeps separate counts per connection", () => {
    const counts = countGrantedPermissions([
      { connection_id: "c1", enabled: true },
      { connection_id: "c2", enabled: true },
      { connection_id: "c2", enabled: true },
    ]);
    expect(counts.get("c1")).toBe(1);
    expect(counts.get("c2")).toBe(2);
  });

  it("returns an empty map for no permissions", () => {
    expect(countGrantedPermissions([]).size).toBe(0);
  });

  it("a connection with only revoked grants has no entry at all (not zero)", () => {
    const counts = countGrantedPermissions([{ connection_id: "c1", enabled: false }]);
    expect(counts.has("c1")).toBe(false);
  });
});

describe("integrations page wiring", () => {
  it("the connection menu's disconnect button targets the real disconnect API route", () => {
    const src = readFileSync(path.resolve(__dirname, "../../components/integrations/connection-menu.tsx"), "utf-8");
    expect(src).toMatch(/fetch\("\/api\/integrations\/disconnect"/);
    expect(src).toMatch(/method: "POST"/);
    expect(src).toMatch(/body: JSON\.stringify\(\{ provider \}\)/);
  });

  it("every integration card offers the settings menu once connected", () => {
    const src = readFileSync(path.resolve(__dirname, "../../app/dashboard/integrations/page.tsx"), "utf-8");
    expect(src).toMatch(/isConnected && <ConnectionMenu/);
  });
});
