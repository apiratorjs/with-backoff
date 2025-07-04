# @apiratorjs/with-backoff

[![NPM version](https://img.shields.io/npm/v/@apiratorjs/with-backoff.svg)](https://www.npmjs.com/package/@apiratorjs/with-backoff)
[![License: MIT](https://img.shields.io/npm/l/@apiratorjs/with-backoff.svg)](https://github.com/apiratorjs/with-backoff/blob/main/LICENSE)

A lightweight zero-dependency library for retrying operations with backoff for JavaScript and TypeScript. Features exponential and linear backoff strategies, jitter support, and specialized retry handlers for common error types.

> **Note:** Requires Node.js version **>=16.4.0**
 
---

## Features

- **Multiple Backoff Strategies:**
  - **Exponential Backoff:** Delay increases exponentially between retries (default)
  - **Linear Backoff:** Constant delay between retries
  
- **Specialized Error Handlers:**
  - Network errors (`withNetworkBackoff`)
  - Internal server errors (`withInternalServerErrorBackoff`)
  - Connection error messages (`withConnectionErrorMessageBackoff`)

- **Flexible Configuration:**
  - Customizable retry attempts and delays
  - Jitter support to prevent thundering herd
  - Custom retry condition functions
  - Relative time support for delay calculations
  - AbortController support for cancellation

- **TypeScript Support:**
  - Full type definitions included
  - Method decorators for class-based usage
  - Generic type support for operation results

---

## Installation

Install via npm:

```bash
npm install @apiratorjs/with-backoff
```

Or using yarn:

```bash
yarn add @apiratorjs/with-backoff
```

## Basic Usage

### Simple Retry with Options

```typescript
import { withBackoff } from '@apiratorjs/with-backoff';

async function fetchData() {
  const result = await withBackoff(
    async () => {
      const response = await fetch('https://api.example.com/data');
      return response.json();
    },
    {
      maxAttempts: 3,
      delayMs: 1000,
      isRetryable: (error) => true // Specify which errors should be retried
    }
  );
  
  return result;
}
```

### Using Specialized Error Handlers

```typescript
import { withNetworkBackoff } from '@apiratorjs/with-backoff';

async function fetchWithNetworkRetry() {
  return withNetworkBackoff(async () => {
    const response = await fetch('https://api.example.com/data');
    return response.json();
  });
}
```

### Combining Multiple Error Handlers

You can combine different backoff handlers to handle various types of errors:

```typescript
import { 
  withNetworkBackoff, 
  withInternalServerErrorBackoff 
} from '@apiratorjs/with-backoff';

class ApiClient {
  async fetchData() {
    // First handle network errors
    return withNetworkBackoff(async () => {
      // Then handle 5xx errors
      return withInternalServerErrorBackoff(async () => {
        const response = await fetch('https://api.example.com/data');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      });
    });
  }
}

// Usage
const client = new ApiClient();
try {
  const data = await client.fetchData();
  console.log('Data fetched successfully:', data);
} catch (error) {
  console.error('Failed after all retries:', error);
}
```

### Using Decorators

```typescript
import { 
  WithNetworkBackoff,
  WithInternalServerErrorBackoff 
} from '@apiratorjs/with-backoff';

class ApiService {
  @WithNetworkBackoff()
  @WithInternalServerErrorBackoff()
  async fetchUserProfile(userId: string) {
    const response = await fetch(`https://api.example.com/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}
```

## Advanced Configuration

### Custom Retry Conditions

```typescript
import { withBackoff } from '@apiratorjs/with-backoff';

const result = await withBackoff(
  async () => {
    // Your operation here
  },
  {
    maxAttempts: 5,
    delayMs: 1000,
    delayFactor: 2,
    strategy: 'exponential',
    jitter: 0.2,
    isRetryable: (error) => {
      // Custom retry condition
      return error.code === 'CUSTOM_ERROR';
    },
    onRetry: async ({ attempt, delay, error }) => {
      console.log(`Retry attempt ${attempt} after ${delay}ms due to:`, error);
    }
  }
);
```

### Using Linear Backoff

```typescript
import { withBackoff } from '@apiratorjs/with-backoff';

const result = await withBackoff(
  async () => {
    // Your operation here
  },
  {
    maxAttempts: 3,
    delayMs: 1000,
    strategy: 'linear',
    jitter: 0.1
  }
);
```

### Using AbortController

```typescript
import { withBackoff } from '@apiratorjs/with-backoff';

async function fetchWithTimeout() {
  const controller = new AbortController();
  
  // Automatically abort after 5 seconds
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const result = await withBackoff(
      async () => {
        const response = await fetch('https://api.example.com/data', {
          signal: controller.signal // Pass the signal to fetch as well
        });
        return response.json();
      },
      {
        maxAttempts: 3,
        delayMs: 1000,
        signal: controller.signal // Pass the signal to withBackoff
      }
    );
    
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      console.log('Operation was aborted:', error.message);
    }
    throw error;
  }
}
```

## API Reference

### Core Function

#### `withBackoff<T>(operation: () => Promise<T> | T, options?: TBackoffOptions): Promise<T>`

Main function for retrying operations with backoff.

### Specialized Functions

- `withNetworkBackoff<T>(operation: () => Promise<T>, onRetry?: TBackoffOnRetry): Promise<T>`
- `withInternalServerErrorBackoff<T>(operation: () => Promise<T>, onRetry?: TBackoffOnRetry): Promise<T>`
- `withConnectionErrorMessageBackoff<T>(operation: () => Promise<T>, onRetry?: TBackoffOnRetry): Promise<T>`

### Decorators

- `@WithBackoff(options: TBackoffOptions)`
- `@WithNetworkBackoff(onRetry?: TBackoffOnRetry)`
- `@WithInternalServerErrorBackoff(onRetry?: TBackoffOnRetry)`
- `@WithConnectionErrorMessageBackoff(onRetry?: TBackoffOnRetry)`

### Options

```typescript
type TBackoffOptions = {
  maxAttempts?: number;      // Default: 6
  delayMs?: number;          // Default: 20
  delayFactor?: number;      // Default: 4
  jitter?: number;           // Default: 0
  strategy?: 'exponential' | 'linear';  // Default: 'exponential'
  relativeTo?: Date | null;  // Default: null
  onRetry?: (options: TRetryOptions) => Promise<void> | void;
  isRetryable?: (error: TError) => Promise<boolean> | boolean;
  signal?: AbortSignal | null;  // Default: null, AbortController signal for cancellation
};

type TRetryOptions = {
  attempt: number;
  delay: number;
  error: TError;
};
```

## Error Types Handled

### Network Errors
- ECONNRESET (Connection reset by peer)
- ENOTFOUND (DNS lookup failed)
- ETIMEDOUT (Operation timed out)
- EPIPE (Broken pipe)
- ENETUNREACH (Network unreachable)
- And more...

### Internal Server Errors
- Any HTTP response with status code >= 500

### Connection Error Messages
- ECONNREFUSED
- ConnectionRefused
- Socket hang up
- And other common connection error messages

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/apiratorjs/with-backoff/issues).

## License

This project is [MIT](./LICENSE) licensed.
