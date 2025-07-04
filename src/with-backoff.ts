import { createDelayList } from "./create-delay-list";
import { AbortError } from "./errors";
import { TBackoffOptions, TError, TRetryOptions } from "./types";
import { wait } from "./utils";

const DEFAULT_OPTIONS: Required<TBackoffOptions> = {
  maxAttempts: 6,
  delayMs: 20,
  delayFactor: 4,
  jitter: 0,
  strategy: "exponential",
  onRetry: async (retryOptions: TRetryOptions) => {},
  isRetryable: (error: TError) => false,
  signal: null,
};

export async function withBackoff<T>(
  operation: () => Promise<T> | T,
  options: Partial<TBackoffOptions> = {}
): Promise<T> {
  const mergedOptions: Required<TBackoffOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const { maxAttempts, onRetry, isRetryable, signal } = mergedOptions;

  const delays = createDelayList(mergedOptions);
  let attempt = 1;

  const abortPromise = new Promise<never>((_, reject) => {
    if (signal?.aborted) {
      reject(new AbortError("Backoff aborted", signal.reason));
    }
    signal?.addEventListener("abort", () => {
      reject(new AbortError("Backoff aborted", signal.reason));
    });
  });

  while (attempt <= maxAttempts && !signal?.aborted) {
    try {
      return await Promise.race([operation(), abortPromise]);
    } catch (error) {
      if (error instanceof AbortError) {
        throw error;
      }

      if (attempt === maxAttempts) {
        throw error;
      }

      if (!(await isRetryable(error as TError))) {
        throw error;
      }

      const currentDelayMs = delays.shift()!;

      await onRetry({
        attempt,
        delay: currentDelayMs,
        error: error as TError,
      });

      await Promise.race([wait(currentDelayMs), abortPromise]);

      attempt++;
    }
  }

  if (signal?.aborted) {
    throw new AbortError("Backoff aborted", signal.reason);
  }

  throw new Error("Max attempts exceeded");
}
