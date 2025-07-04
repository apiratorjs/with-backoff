import assert from "assert";
import { describe, it } from "node:test";
import { withBackoff } from "../src";
import { AbortError } from "../src/errors";

// Helper function to create a failing operation that succeeds after N attempts
function createFailingOperation(successOnAttempt: number) {
  let attempts = 0;
  return async () => {
    attempts++;
    if (attempts < successOnAttempt) {
      throw new Error(`Attempt ${attempts} failed`);
    }
    return "success";
  };
}

describe("withBackoff", () => {
  it("should succeed on first attempt if operation succeeds", async () => {
    const operation = async () => "success";
    const result = await withBackoff(operation, {
      maxAttempts: 3,
      delayMs: 1,
      isRetryable: () => true
    });
    assert.strictEqual(result, "success");
  });

  it("should retry and succeed if operation fails initially but succeeds later", async () => {
    const operation = createFailingOperation(3);
    const retryAttempts: number[] = [];

    const result = await withBackoff(operation, {
      maxAttempts: 3,
      delayMs: 1,
      isRetryable: () => true,
      onRetry: async ({ attempt }) => {
        retryAttempts.push(attempt);
      }
    });

    assert.strictEqual(result, "success");
    assert.deepStrictEqual(retryAttempts, [1, 2]);
  });

  it("should throw if max attempts are exceeded", async () => {
    const operation = createFailingOperation(4);
    const retryAttempts: number[] = [];

    await assert.rejects(
      async () => {
        await withBackoff(operation, {
          maxAttempts: 3,
          delayMs: 1,
          isRetryable: () => true,
          onRetry: async ({ attempt }) => {
            retryAttempts.push(attempt);
          }
        });
      },
      (error: Error) => {
        assert.strictEqual(error.message, "Attempt 3 failed");
        assert.deepStrictEqual(retryAttempts, [1, 2]); // Verify exactly 2 retries were attempted
        return true;
      }
    );
  });

  it("should not retry if isRetryable returns false", async () => {
    const operation = createFailingOperation(2);

    await assert.rejects(
      async () => {
        await withBackoff(operation, {
          maxAttempts: 3,
          delayMs: 1,
          isRetryable: () => false
        });
      },
      (err: Error) => {
        assert.strictEqual(err.message, "Attempt 1 failed");
        return true;
      }
    );
  });

  it("should use exponential backoff strategy by default", async () => {
    const delays: number[] = [];
    const operation = createFailingOperation(4);

    await withBackoff(operation, {
      maxAttempts: 4,
      delayMs: 10,
      delayFactor: 2,
      jitter: 0,
      isRetryable: () => true,
      onRetry: async ({ delay }) => {
        delays.push(delay);
      }
    });

    assert.strictEqual(delays[0], 10);
    assert.strictEqual(delays[1], 20);
    assert.strictEqual(delays[2], 40);
  });

  it("should use linear backoff strategy when specified", async () => {
    const delays: number[] = [];
    const operation = createFailingOperation(3);

    await withBackoff(operation, {
      maxAttempts: 3,
      delayMs: 10,
      strategy: "linear",
      jitter: 0,
      isRetryable: () => true,
      onRetry: async ({ delay }) => {
        delays.push(delay);
      }
    });

    assert.strictEqual(delays[0], 10);
    assert.strictEqual(delays[1], 10);
  });

  it("should respect relativeTo option", async () => {
    const delays: number[] = [];
    const operation = createFailingOperation(2);
    const baseTime = new Date("2024-01-01T00:00:00Z");

    await withBackoff(operation, {
      maxAttempts: 2,
      delayMs: 1000,
      strategy: "linear",
      jitter: 0,
      relativeTo: baseTime,
      isRetryable: () => true,
      onRetry: async ({ delay }) => {
        delays.push(delay);
      }
    });

    assert.strictEqual(delays[0], baseTime.getTime() + 1000);
  });

  it("should use default options if none provided", async () => {
    const operation = async () => "success";
    const result = await withBackoff(operation);
    assert.strictEqual(result, "success");
  });

  it("should handle abort with Error reason", async () => {
    const operation = createFailingOperation(3);
    const controller = new AbortController();
    const abortError = new Error("Some abort error");

    setTimeout(() => {
      controller.abort(abortError);
    }, 10);

    await assert.rejects(
      async () => {
        await withBackoff(operation, {
          maxAttempts: 3,
          delayMs: 100,
          signal: controller.signal,
          isRetryable: () => true
        });
      },
      (error: AbortError) => {
        assert.strictEqual(error.name, "AbortError");
        assert.strictEqual(error.message, "Backoff aborted");
        assert.strictEqual(error.cause, abortError);
        return true;
      }
    );
  });

  it("should handle abort with custom reason", async () => {
    const operation = createFailingOperation(3);
    const controller = new AbortController();
    const customReason = { message: "Custom abort reason", code: "CUSTOM_ABORT" };

    // Abort after a small delay
    setTimeout(() => {
      controller.abort(customReason);
    }, 10);

    await assert.rejects(
      async () => {
        await withBackoff(operation, {
          maxAttempts: 3,
          delayMs: 100,
          signal: controller.signal,
          isRetryable: () => true
        });
      },
      (error: AbortError) => {
        assert.strictEqual(error.name, "AbortError");
        assert.strictEqual(error.message, "Backoff aborted");
        assert.strictEqual(error.cause, customReason);
        return true;
      }
    );
  });

  it("should abort during long-running operation execution", async () => {
    const controller = new AbortController();
    let operationStarted = false;

    // Create an operation that takes some time to complete
    const operation = async () => {
      operationStarted = true;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Long operation
      return "success";
    };

    // Abort after we ensure operation has started
    setTimeout(async () => {
      // Wait until operation has started
      while (!operationStarted) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      controller.abort("Operation cancelled");
    }, 0);

    await assert.rejects(
      async () => {
        await withBackoff(operation, {
          maxAttempts: 3,
          delayMs: 100,
          signal: controller.signal,
          isRetryable: () => true
        });
      },
      (error: AbortError) => {
        assert.strictEqual(error.name, "AbortError");
        assert.strictEqual(error.message, "Backoff aborted");
        assert.strictEqual(error.cause, "Operation cancelled");
        assert.strictEqual(operationStarted, true); // Verify operation was actually started
        return true;
      }
    );
  });
});
