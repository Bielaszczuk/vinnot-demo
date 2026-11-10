/**
 * Axios HTTP client with authentication interceptors
 *
 * Features:
 * - Automatic Authorization header injection
 * - Token refresh on 401 with request queuing
 * - Only one refresh request at a time (concurrent requests wait)
 * - Delegated session-expiration policy through the injected refresh handler
 */

import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { isHttpError, mapAxiosError } from './errors'

const defaultApiBaseUrl = '/api'
const defaultApiTimeout = 30000

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
const rawApiTimeout = Number(import.meta.env.VITE_API_TIMEOUT)

const apiBaseUrl = rawApiBaseUrl && rawApiBaseUrl.trim().length > 0 ? rawApiBaseUrl : defaultApiBaseUrl
const apiTimeout = Number.isFinite(rawApiTimeout) && rawApiTimeout > 0 ? rawApiTimeout : defaultApiTimeout

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _sessionGeneration?: number
  _reauthenticated?: boolean
  _retry?: boolean
  _retryCount?: number
}

type QueuedRequest = {
  resolve: (token: string) => void
  reject: (error: Error) => void
}


let accessTokenGetter: (() => string | null) | null = null
let refreshTokenHandler: (() => Promise<string>) | null = null
let sessionGenerationGetter: (() => number) | undefined
let reauthenticationHandler: (() => Promise<string>) | undefined
let adminProof: { value: string; generation: number | undefined } | undefined
let proofRequest: Promise<string> | undefined

function requestAdminProof(): Promise<string> {
  if (!proofRequest) proofRequest = reauthenticationHandler!().finally(() => { proofRequest = undefined })
  return proofRequest
}

/**
 * Configure token handlers - called from auth initialization
 * This avoids circular dependencies by using dependency injection
 */
export function configureHttpAuth(handlers: {
  getAccessToken: () => string | null
  refreshToken: () => Promise<string>
  getSessionGeneration?: () => number
  reauthenticate?: () => Promise<string>
}): void {
  accessTokenGetter = handlers.getAccessToken
  refreshTokenHandler = handlers.refreshToken
  sessionGenerationGetter = handlers.getSessionGeneration
  reauthenticationHandler = handlers.reauthenticate
  adminProof = undefined
}


let isRefreshing = false
let refreshQueue: QueuedRequest[] = []

/**
 * Process queued requests after token refresh
 */
function processQueue(error: Error | null, token: string | null = null): void {
  refreshQueue.forEach((request) => {
    if (error) {
      request.reject(error)
    } else if (token) {
      request.resolve(token)
    }
  })
  refreshQueue = []
}

/**
 * Attempt to refresh the access token
 * Queues concurrent requests to prevent multiple refresh calls
 */
async function attemptTokenRefresh(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      refreshQueue.push({ resolve, reject })
    })
  }

  isRefreshing = true

  try {
    if (!refreshTokenHandler) {
      throw new Error('Refresh token handler not configured')
    }

    const newToken = await refreshTokenHandler()
    processQueue(null, newToken)
    return newToken
  } catch (error) {
    const refreshError = error instanceof Error ? error : new Error('Token refresh failed')
    processQueue(refreshError)
    throw refreshError
  } finally {
    isRefreshing = false
  }
}

// Axios Instance

export const http: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: apiTimeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const sessionConfig = config as ExtendedAxiosRequestConfig
    if (sessionConfig._sessionGeneration !== undefined
        && sessionConfig._sessionGeneration !== sessionGenerationGetter?.()) {
      throw new axios.CanceledError('Session changed')
    }
    sessionConfig._sessionGeneration = sessionGenerationGetter?.()
    if (adminProof?.generation === sessionConfig._sessionGeneration && adminProof) {
      config.headers.set('X-Admin-Reauthentication', adminProof.value)
    } else {
      config.headers.delete('X-Admin-Reauthentication')
    }
    const token = accessTokenGetter?.()

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error: AxiosError): Promise<never> => {
    return Promise.reject(mapAxiosError(error))
  }
)

http.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    const generation = (response.config as ExtendedAxiosRequestConfig)._sessionGeneration
    if (!response.config.url?.includes('/auth/') && generation !== undefined && generation !== sessionGenerationGetter?.()) {
      throw new axios.CanceledError('Session changed')
    }
    return response
  },
  async (error: AxiosError): Promise<AxiosResponse> => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined

    if (!originalRequest) {
      return Promise.reject(mapAxiosError(error))
    }

    const isUnauthorized = error.response?.status === 401
    const hasNotRetried = !originalRequest._retry
    const hasRefreshHandler = !!refreshTokenHandler

    const isAuthEndpoint = originalRequest.url?.includes('/auth/')
    if (!isAuthEndpoint && originalRequest._sessionGeneration !== undefined
        && originalRequest._sessionGeneration !== sessionGenerationGetter?.()) {
      return Promise.reject(new axios.CanceledError('Session changed'))
    }

    if (error.response?.status === 403
        && (error.response.data as { code?: string })?.code === 'REAUTHENTICATION_REQUIRED'
        && !originalRequest._reauthenticated && reauthenticationHandler) {
      originalRequest._reauthenticated = true
      const value = adminProof && originalRequest.headers.get('X-Admin-Reauthentication') !== adminProof.value
        ? adminProof.value : await requestAdminProof()
      if (originalRequest._sessionGeneration !== sessionGenerationGetter?.()) throw new axios.CanceledError('Session changed')
      adminProof = { value, generation: originalRequest._sessionGeneration }
      return http(originalRequest)
    }

    if (isUnauthorized && hasNotRetried && hasRefreshHandler && !isAuthEndpoint) {
      originalRequest._retry = true
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1

      try {
        const newToken = await attemptTokenRefresh()

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }

        return http(originalRequest)
      } catch (refreshError) {
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(isHttpError(error) ? error : mapAxiosError(error))
  }
)

export default http
