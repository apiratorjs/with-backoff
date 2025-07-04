/**
 * Options for configuring the backoff behavior
 */
export type TBackoffOptions = {
  /**
   * The maximum number of attempts to make before giving up.
   * @default 6
   */
  maxAttempts?: number;

  /**
   * The delay between attempts in milliseconds.
   * For exponential strategy, this is the initial delay.
   * For linear strategy, this is the constant delay.
   * @default 20
   */
  delayMs?: number;

  /**
   * The factor by which the delay increases in exponential backoff.
   * Only used when strategy is "exponential".
   * @default 4
   */
  delayFactor?: number;

  /**
   * Random factor to add to the delay to prevent thundering herd.
   * Value between 0 and 1, representing percentage of variation.
   * @default 0
   */
  jitter?: number;

  /**
   * The strategy to use for calculating delays between retries.
   * - exponential: delay increases exponentially (delayMs * delayFactor^attempt)
   * - linear: delay remains constant (delayMs)
   * @default "exponential"
   */
  strategy?: TBackoffStrategy;

  /**
   * Callback function called before each retry attempt.
   * Can be used for logging or custom delay handling.
   * @default async () => {}
   */
  onRetry?: TBackoffOnRetry;

  /**
   * Function to determine if an error should trigger a retry.
   * Return true to retry, false to throw the error.
   * @default () => false
   */
  isRetryable?: TBackoffIsRetryable;

  /**
   * Signal to cancel the backoff.
   * @default null
   */
  signal?: AbortSignal | null;
};

/**
 * Options used specifically for generating the delay list.
 * Excludes callback functions from TBackoffOptions.
 */
export type TBackoffDelayListOptions = Omit<TBackoffOptions, "onRetry" | "isRetryable">;

/**
 * Available backoff strategies
 */
export type TBackoffStrategy = "exponential" | "linear";

/**
 * Reference time for relative delay calculations
 */
export type TBackoffRelativeTo = Date | null;

/**
 * Callback function type for retry events
 */
export type TBackoffOnRetry = (retryOptions: TRetryOptions) => Promise<void> | void;

/**
 * Function type to determine if an error should trigger a retry
 */
export type TBackoffIsRetryable = (error: TError) => Promise<boolean> | boolean;

/**
 * Options passed to the onRetry callback
 */
export type TRetryOptions = {
  /** Current attempt number (1-based) */
  attempt: number;
  /** Delay in milliseconds before the next attempt */
  delay: number;
  /** The error that triggered the retry */
  error: TError;
};

/**
 * Extended Error type that includes common error properties
 * from various sources (HTTP, Node.js, etc.)
 */
export type TError = Error & {
  /** Error code (e.g. ECONNREFUSED, ETIMEDOUT) */
  code?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Nested error cause with optional code */
  cause?: { code?: string };
  /** HTTP response with optional status code */
  response?: { statusCode?: number };
};
