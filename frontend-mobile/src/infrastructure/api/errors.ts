/**
 * API Error types and mapping utilities.
 * Translates Axios/HTTP errors into typed business errors.
 */
import { AxiosError } from "axios";
import { retryAfterDeadline } from "./retryAfter";

// ─── API Error ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly retryAt?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isValidation(): boolean {
    return this.status === 422 || this.status === 400;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

// ─── Network Error ────────────────────────────────────────────────────────────

/**
 * Translation keys for transport failures. Infrastructure stays free of i18n:
 * presentation translates these keys for the active locale.
 */
export const TRANSPORT_ERROR_MESSAGES = {
  offline: "authErrors.offline",
  timeout: "authErrors.timeout",
  unexpected: "authErrors.unexpected",
} as const;

export class NetworkError extends Error {
  constructor(
    message: string = TRANSPORT_ERROR_MESSAGES.offline,
    public readonly code: "NETWORK_ERROR" | "TIMEOUT" = "NETWORK_ERROR",
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

// ─── Backend error shape ──────────────────────────────────────────────────────

export interface BackendError {
  error?: string;
  code?: string;
  message?: string;
  status?: number;
  timestamp?: string;
  path?: string;
  details?: unknown;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapAxiosError(err: AxiosError<BackendError>): ApiError | NetworkError {
  if (!err.response) {
    if (__DEV__) {
      const baseUrl = err.config?.baseURL ?? "";
      const path = err.config?.url ?? "";
      const nativeRequest = err.request as { _response?: string } | undefined;
      console.warn("[Vinnot HTTP] Network request failed", {
        method: err.config?.method?.toUpperCase(),
        url: `${baseUrl}${path}`,
        code: err.code,
        message: err.message,
        nativeResponse: nativeRequest?._response,
      });
    }
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return new NetworkError(TRANSPORT_ERROR_MESSAGES.timeout, "TIMEOUT");
    }
    return new NetworkError();
  }

  const { status, data } = err.response;
  const message =
    data?.message ?? data?.error ?? err.message ?? TRANSPORT_ERROR_MESSAGES.unexpected;
  const code = data?.code ?? data?.error ?? `HTTP_${status}`;

  return new ApiError(status, code, message, data?.details, retryAfterDeadline(err.response.headers?.["retry-after"]));
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function isNetworkError(err: unknown): err is NetworkError {
  return err instanceof NetworkError;
}
