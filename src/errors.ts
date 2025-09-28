import { TError } from "./types";
import { escapeRegExp } from "./utils";

const NETWORK_ERROR_CODES = new Set([
  "ECONNRESET", // Connection reset by peer
  "ENOTFOUND", // DNS lookup failed
  "ETIMEDOUT", // Operation timed out
  "EPIPE", // Broken pipe
  "ENETUNREACH", // Network unreachable
  "ECONNABORTED", // network connection has been aborted
  "ECONNREFUSED", // network connection has been refused
  "ENETDOWN", // network is down
  "ENETRESET", // connection has been aborted by the network
  "EALREADY", // socket already has a pending connection in progress
  "EAI_AGAIN", // DNS lookup failed
  "EHOSTUNREACH", // host unreachable
]);

export const RETRYABLE_ERROR_MESSAGES = [
  "ECONNREFUSED",
  "ConnectionRefused",
  "SocksClient internal error (this should not happen)",
  "Client network socket disconnected before secure TLS connection was established",
  "Received invalid Socks5 initial handshake (invalid socks version)",
  "socket hang up",
  "Socks5 proxy rejected connection - ConnectionRefused",
];

export function isNetworkError(err: TError) {
  const code = err.cause?.code ?? err.code;
  return Boolean(code && NETWORK_ERROR_CODES.has(code));
}

export function isInternalServerError(err: TError) {
  const statusCode = err.statusCode || err?.response?.statusCode ||err?.response?.status;
  return Boolean(statusCode && statusCode >= 500);
}

export function isConnectionErrorMessage(err: TError): boolean {
  const errorMessage = err.message;
  return new RegExp(
    RETRYABLE_ERROR_MESSAGES.map(
      (message) => `(${escapeRegExp(message)})`
    ).join("|")
  ).test(errorMessage);
}

export class AbortError extends Error {
  public cause?: Error;

  constructor(reason: any, cause?: Error) {
    super(String(reason));
    this.cause = cause;
    this.name = "AbortError";
  }
}
