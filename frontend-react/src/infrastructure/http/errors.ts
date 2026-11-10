import type { AxiosError } from 'axios'
import { retryAfterDeadline } from './retryAfter'

interface BackendErrorResponse {
  code?: string
  message?: string
  error?: string
  details?: unknown
  errors?: unknown
  path?: string
  traceId?: string
  timestamp?: string
}

export class HttpError extends Error {
  public readonly status: number
  public readonly code: string
  public readonly details?: unknown
  public readonly timestamp: string
  public readonly path?: string
  public readonly traceId?: string
  public readonly retryAt?: number

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    timestamp = new Date().toISOString(),
    path?: string,
    traceId?: string,
    retryAt?: number,
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
    this.timestamp = timestamp
    this.path = path
    this.traceId = traceId
    this.retryAt = retryAt
  }
}

export class NetworkError extends HttpError {
  constructor(message = 'Network error. Please check your connection.', code = 'NETWORK_ERROR') {
    super(0, code, message)
    this.name = 'NetworkError'
  }
}

export function mapAxiosError(error: AxiosError<unknown>): HttpError {
  if (!error.response) {
    const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout')
    return new NetworkError(
      isTimeout
        ? 'Request timed out. Please try again.'
        : 'Network error. Please check your connection.',
      isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    )
  }

  const { status } = error.response
  const data = isBackendErrorResponse(error.response.data) ? error.response.data : undefined
  return new HttpError(
    status,
    data?.code ?? data?.error ?? `HTTP_${status}`,
    data?.message ?? data?.error ?? error.message ?? 'An unexpected error occurred.',
    data?.details ?? data?.errors,
    data?.timestamp,
    data?.path ?? error.config?.url,
    data?.traceId,
    retryAfterDeadline(error.response.headers?.['retry-after']),
  )
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError
}

function isBackendErrorResponse(value: unknown): value is BackendErrorResponse {
  return typeof value === 'object' && value !== null
}
