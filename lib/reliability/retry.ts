export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 3;
  const base = options.baseDelayMs ?? 250;
  const max = options.maxDelayMs ?? 5_000;
  const jitter = options.jitter ?? 0.2;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= retries || options.shouldRetry?.(error, attempt) === false) throw error;
      const exponential = Math.min(max, base * 2 ** attempt);
      const delta = exponential * jitter * (Math.random() * 2 - 1);
      await sleep(Math.max(0, exponential + delta));
    }
  }
}
