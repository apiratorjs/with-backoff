import { isConnectionErrorMessage } from "./errors";
import { TBackoffOnRetry } from "./types";
import { withBackoff } from "./with-backoff";

export async function withConnectionErrorMessageBackoff<T>(
  callback: () => Promise<T>,
  onRetry?: TBackoffOnRetry
): Promise<T> {
  return withBackoff(callback, {
    isRetryable: isConnectionErrorMessage,
    onRetry,
  });
}
