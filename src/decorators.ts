import { TBackoffOnRetry, TBackoffOptions, TRetryOptions } from "./types";
import { withBackoff } from "./with-backoff";
import { withConnectionErrorMessageBackoff } from "./with-connection-error-message-backoff";
import { withInternalServerErrorBackoff } from "./with-internal-server-error-backoff";
import { withNetworkBackoff } from "./with-network-backoff";

export function WithBackoff(options: TBackoffOptions): MethodDecorator {
  return function (
    _target: object,
    _key: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return withBackoff(originalMethod.bind(this, ...args), options);
    };

    return descriptor;
  };
}

export function WithNetworkBackoff(onRetry?: TBackoffOnRetry): MethodDecorator {
  return function (
    _target: object,
    _key: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return withNetworkBackoff(originalMethod.bind(this, ...args), onRetry);
    };

    return descriptor;
  };
}

export function WithInternalServerErrorBackoff(
  onRetry?: TBackoffOnRetry
): MethodDecorator {
  return function (
    _target: object,
    _key: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return withInternalServerErrorBackoff(
        originalMethod.bind(this, ...args),
        onRetry
      );
    };

    return descriptor;
  };
}

export function WithConnectionErrorMessageBackoff(
  onRetry?: TBackoffOnRetry
): MethodDecorator {
  return function (
    _target: object,
    _key: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return withConnectionErrorMessageBackoff(
        originalMethod.bind(this, ...args),
        onRetry
      );
    };

    return descriptor;
  };
}
