import { describe, it, expect } from "vitest";
import { isSameOriginRequest } from "@/lib/security/csrf";

describe("isSameOriginRequest", () => {
  it("accepts a request whose origin host matches the host header", () => {
    expect(isSameOriginRequest("https://chatbo.ai", "chatbo.ai")).toBe(true);
  });

  it("accepts a matching origin with a port", () => {
    expect(isSameOriginRequest("http://localhost:3000", "localhost:3000")).toBe(true);
  });

  it("rejects a cross-site origin (the actual CSRF case)", () => {
    expect(isSameOriginRequest("https://evil.com", "chatbo.ai")).toBe(false);
  });

  it("rejects a missing origin header", () => {
    expect(isSameOriginRequest(null, "chatbo.ai")).toBe(false);
  });

  it("rejects a missing host header", () => {
    expect(isSameOriginRequest("https://chatbo.ai", null)).toBe(false);
  });

  it("rejects a malformed origin header instead of throwing", () => {
    expect(isSameOriginRequest("not-a-url", "chatbo.ai")).toBe(false);
  });

  it("is not fooled by a similarly-named but different host (prefix confusion)", () => {
    expect(isSameOriginRequest("https://notchatbo.ai", "chatbo.ai")).toBe(false);
  });

  it("treats different ports on the same hostname as different origins", () => {
    expect(isSameOriginRequest("https://chatbo.ai:8080", "chatbo.ai")).toBe(false);
  });
});
