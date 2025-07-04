import { TBackoffDelayListOptions } from "./types";

export function createDelayList(options: TBackoffDelayListOptions): number[] {
  let { maxAttempts, delayMs, delayFactor, jitter, strategy, relativeTo } = options;

  let delaysMs: number[] = [];

  if (strategy === 'exponential') {
    delaysMs = Array.from({ length: maxAttempts! }, (_, i) => {
      const baseDelay = delayMs! * Math.pow(delayFactor!, i);
      return baseDelay + (baseDelay * (jitter! || 0) * Math.random());
    });
  }

  if (strategy === 'linear') {
    delaysMs = Array.from({ length: maxAttempts! }, () => {
      const baseDelay = delayMs!;
      return baseDelay + (baseDelay * (jitter! || 0) * Math.random());
    });
  }

  if (relativeTo && relativeTo instanceof Date) {
    const time = relativeTo.getTime();
    return delaysMs.map((delay) => time + delay);
  }

  return delaysMs;
}