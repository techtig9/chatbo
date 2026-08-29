import { describe, expect, it } from "vitest";
import { hashRequestBody } from "@/lib/api/v1/idempotency";

describe("developer API", () => {
  it("hashes equivalent JSON payloads deterministically", () => {
    expect(hashRequestBody({ message: "hello" })).toBe(hashRequestBody({ message: "hello" }));
    expect(hashRequestBody({ message: "hello" })).not.toBe(hashRequestBody({ message: "bye" }));
  });
});
