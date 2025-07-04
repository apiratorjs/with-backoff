import { isInternalServerError } from "./errors";
import { TBackoffOnRetry } from "./types";
import { withBackoff } from "./with-backoff";

export async function withInternalServerErrorBackoff<T>(
  callback: () => Promise<T>,
  onRetry?: TBackoffOnRetry
): Promise<T> {
  return withBackoff(callback, {
    isRetryable: isInternalServerError,
    onRetry,
  });
}
