import { isNetworkError } from "./errors";
import { TBackoffOnRetry } from "./types";
import { withBackoff } from "./with-backoff";

export async function withNetworkBackoff<T>(
  callback: () => Promise<T>,
  onRetry?: TBackoffOnRetry
): Promise<T> {
  return withBackoff(callback, {
    isRetryable: isNetworkError,
    onRetry,
  });
}
