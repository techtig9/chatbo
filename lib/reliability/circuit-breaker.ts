export type CircuitState = "closed" | "open" | "half-open";

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private openedAt = 0;

  constructor(private readonly threshold = 5, private readonly resetMs = 30_000) {}

  getState(): CircuitState {
    if (this.state === "open" && Date.now() - this.openedAt >= this.resetMs) this.state = "half-open";
    return this.state;
  }

  success() {
    this.failures = 0;
    this.state = "closed";
  }

  failure() {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.getState() === "open") throw new Error("Circuit breaker is open");
    try {
      const result = await fn();
      this.success();
      return result;
    } catch (error) {
      this.failure();
      throw error;
    }
  }
}
