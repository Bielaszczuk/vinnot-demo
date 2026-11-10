/**
 * HTTP Transport Layer — Vinnot Mobile
 *
 * Central Axios instance shared by ALL API clients.
 * Features:
 *   - Bearer token injection via request interceptor
 *   - 401 → token refresh with request queuing (no race conditions)
 *   - Single active refresh at a time (isRefreshing flag)
 *   - Delegated refresh/session policy through an injected application handler
 *   - Dependency injection via configureHttpAuth() (avoids circular imports)
 *   - Typed error mapping
 *   - Request cancellation helpers
 *
 * DEPENDENCY RULE: This file MUST NOT import from stores/ or providers/.
 * Auth handlers are injected externally by AuthProvider at boot.
 *
 * @architecture: Capa 5 — Transporte
 */
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  CancelTokenSource,
  InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/shared/config/env";
import { HTTP_CONFIG } from "@/shared/config/constants";
import { mapAxiosError, BackendError } from "./errors";

// ─── Axios Instance ───────────────────────────────────────────────────────────

export const http: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: HTTP_CONFIG.timeout,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Auth handler injection (Dependency Injection) ────────────────────────────

interface HttpAuthHandlers {
  getAccessToken: () => string | null;
  refreshToken: () => Promise<string>;
  getSessionGeneration?: () => number;
  reauthenticate?: () => Promise<string>;
}

type SessionRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _reauthenticated?: boolean;
  _sessionGeneration?: number;
};
let adminProof: { value: string; generation: number | undefined } | undefined;
let proofRequest: Promise<string> | undefined;

function requestAdminProof(): Promise<string> {
  if (!proofRequest)
    proofRequest = authHandlers!.reauthenticate!().finally(() => {
      proofRequest = undefined;
    });
  return proofRequest;
}

let authHandlers: HttpAuthHandlers | null = null;

/**
 * Called by AuthProvider at app boot.
 * Injects store-level callbacks without creating a circular dependency.
 */
export function configureHttpAuth(handlers: HttpAuthHandlers): void {
  authHandlers = handlers;
  adminProof = undefined;
}

// ─── Token Refresh Queue ──────────────────────────────────────────────────────

type QueueEntry = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
const refreshQueue: QueueEntry[] = [];

function processQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach((entry) => {
    if (error) {
      entry.reject(error);
    } else {
      entry.resolve(token!);
    }
  });
  refreshQueue.length = 0;
}

async function attemptTokenRefresh(): Promise<string> {
  if (!authHandlers) throw new Error("Auth handlers not configured");
  return authHandlers.refreshToken();
}

// ─── Request Interceptor ──────────────────────────────────────────────────────

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const session = config as SessionRequest;
    if (
      session._sessionGeneration !== undefined &&
      session._sessionGeneration !== authHandlers?.getSessionGeneration?.()
    ) {
      throw new Error("Session changed");
    }
    session._sessionGeneration = authHandlers?.getSessionGeneration?.();
    if (adminProof && adminProof.generation === session._sessionGeneration) {
      config.headers.set("X-Admin-Reauthentication", adminProof.value);
    } else {
      config.headers.delete("X-Admin-Reauthentication");
    }
    const token = authHandlers?.getAccessToken();
    if (
      token &&
      config.headers &&
      (!config.url?.startsWith("/auth/") || !config.headers.Authorization)
    ) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ────────────────────────────────────────────────────

http.interceptors.response.use(
  (response) => {
    const generation = (response.config as SessionRequest)._sessionGeneration;
    if (
      !response.config.url?.startsWith("/auth/") &&
      generation !== undefined &&
      generation !== authHandlers?.getSessionGeneration?.()
    ) {
      throw new Error("Session changed");
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as SessionRequest | undefined;

    const is401 = error.response?.status === 401;
    const isAuthEndpoint = originalRequest?.url?.startsWith("/auth/");
    const alreadyRetried = originalRequest?._retry;

    if (
      originalRequest &&
      !isAuthEndpoint &&
      originalRequest._sessionGeneration !== undefined &&
      originalRequest._sessionGeneration !== authHandlers?.getSessionGeneration?.()
    ) {
      throw new Error("Session changed");
    }
    if (
      originalRequest &&
      error.response?.status === 403 &&
      (error.response.data as { code?: string })?.code === "REAUTHENTICATION_REQUIRED" &&
      !originalRequest._reauthenticated &&
      authHandlers?.reauthenticate
    ) {
      originalRequest._reauthenticated = true;
      const value =
        adminProof && originalRequest.headers.get("X-Admin-Reauthentication") !== adminProof.value
          ? adminProof.value
          : await requestAdminProof();
      if (originalRequest._sessionGeneration !== authHandlers.getSessionGeneration?.())
        throw new Error("Session changed");
      adminProof = { value, generation: originalRequest._sessionGeneration };
      // The confirmation flow renews the session. Its proof is bound to that
      // bearer, so the protected retry must not retain the original token.
      originalRequest.headers.delete("Authorization");
      return http(originalRequest);
    }

    if (!originalRequest || !is401 || isAuthEndpoint || alreadyRetried || !authHandlers) {
      return Promise.reject(mapAxiosError(error as AxiosError<BackendError>));
    }

    // Mark to prevent infinite retry loops
    originalRequest._retry = true;

    if (isRefreshing) {
      // Queue this request until the active refresh completes
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return http(originalRequest);
        })
        .catch((refreshError: unknown) => Promise.reject(refreshError));
    }

    isRefreshing = true;

    try {
      const newToken = await attemptTokenRefresh();
      processQueue(null, newToken);
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      return http(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ─── Cancel Token Helpers ─────────────────────────────────────────────────────

export function createCancelToken(): CancelTokenSource {
  return axios.CancelToken.source();
}

export function isCancel(error: unknown): boolean {
  return axios.isCancel(error);
}

export type { AxiosRequestConfig };
