import { createDelayList } from "./create-delay-list";
import { TBackoffOptions, TError, TRetryOptions } from "./types";
import { wait } from "./utils";

const DEFAULT_OPTIONS: Required<TBackoffOptions> = {
  maxAttempts: 6,
  delayMs: 20,
  delayFactor: 4,
  jitter: 0,
  strategy: "exponential",
  relativeTo: null,
  onRetry: async (retryOptions: TRetryOptions) => {},
  isRetryable: (error: TError) => false,
};

export async function withBackoff<T>(
  operation: () => Promise<T> | T,
  options: Partial<TBackoffOptions> = {}
): Promise<T> {
  const mergedOptions: Required<TBackoffOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const { maxAttempts, onRetry, isRetryable } = mergedOptions;

  const delays = createDelayList(mergedOptions);
  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      // If this was the last attempt, throw the error
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

      await wait(currentDelayMs);
      attempt++;
    }
  }

  // This should never be reached due to the return in try block
  // or throw in catch block, but TypeScript needs it
  throw new Error("Max attempts exceeded");
}
