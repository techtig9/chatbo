import { describe, expect, it } from "vitest";
import { nextHealthState, isCurrentlyDisabled, type ProviderHealthRow } from "@/lib/ai/provider-health";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("nextHealthState", () => {
  it("a success from a clean slate resets failures and clears any disable", () => {
    const next = nextHealthState(null, true, NOW);
    expect(next).toEqual({ consecutiveFailures: 0, lastFailureAt: null, lastSuccessAt: NOW.toISOString(), disabledUntil: null });
  });

  it("a single failure increments the counter but does not disable the provider yet", () => {
    const next = nextHealthState(null, false, NOW);
    expect(next.consecutiveFailures).toBe(1);
    expect(next.disabledUntil).toBeNull();
  });

  it("failures accumulate across calls", () => {
    const current: ProviderHealthRow = { provider: "groq", consecutiveFailures: 1, lastFailureAt: null, lastSuccessAt: null, disabledUntil: null };
    const next = nextHealthState(current, false, NOW);
    expect(next.consecutiveFailures).toBe(2);
  });

  it("the 3rd consecutive failure disables the provider for a 2-minute cooldown", () => {
    const current: ProviderHealthRow = { provider: "groq", consecutiveFailures: 2, lastFailureAt: null, lastSuccessAt: null, disabledUntil: null };
    const next = nextHealthState(current, false, NOW);
    expect(next.consecutiveFailures).toBe(3);
    expect(next.disabledUntil).toBe(new Date(NOW.getTime() + 2 * 60_000).toISOString());
  });

  it("a success immediately clears an active disable, even mid-cooldown", () => {
    const current: ProviderHealthRow = { provider: "groq", consecutiveFailures: 4, lastFailureAt: NOW.toISOString(), lastSuccessAt: null, disabledUntil: new Date(NOW.getTime() + 60_000).toISOString() };
    const next = nextHealthState(current, true, NOW);
    expect(next.consecutiveFailures).toBe(0);
    expect(next.disabledUntil).toBeNull();
  });

  it("preserves the prior lastSuccessAt across failures, and prior lastFailureAt across successes", () => {
    const priorSuccess = new Date(NOW.getTime() - 3600_000).toISOString();
    const failing = nextHealthState({ provider: "groq", consecutiveFailures: 0, lastFailureAt: null, lastSuccessAt: priorSuccess, disabledUntil: null }, false, NOW);
    expect(failing.lastSuccessAt).toBe(priorSuccess);

    const priorFailure = new Date(NOW.getTime() - 3600_000).toISOString();
    const succeeding = nextHealthState({ provider: "groq", consecutiveFailures: 1, lastFailureAt: priorFailure, lastSuccessAt: null, disabledUntil: null }, true, NOW);
    expect(succeeding.lastFailureAt).toBe(priorFailure);
  });
});

describe("isCurrentlyDisabled", () => {
  it("is false when there is no row at all", () => {
    expect(isCurrentlyDisabled(undefined, NOW)).toBe(false);
  });

  it("is false when disabledUntil is null", () => {
    expect(isCurrentlyDisabled({ provider: "groq", consecutiveFailures: 3, lastFailureAt: null, lastSuccessAt: null, disabledUntil: null }, NOW)).toBe(false);
  });

  it("is true while disabledUntil is still in the future", () => {
    const row: ProviderHealthRow = { provider: "groq", consecutiveFailures: 3, lastFailureAt: null, lastSuccessAt: null, disabledUntil: new Date(NOW.getTime() + 60_000).toISOString() };
    expect(isCurrentlyDisabled(row, NOW)).toBe(true);
  });

  it("is false once disabledUntil has passed — the cooldown clears itself with time, no extra write needed", () => {
    const row: ProviderHealthRow = { provider: "groq", consecutiveFailures: 3, lastFailureAt: null, lastSuccessAt: null, disabledUntil: new Date(NOW.getTime() - 1000).toISOString() };
    expect(isCurrentlyDisabled(row, NOW)).toBe(false);
  });
});
