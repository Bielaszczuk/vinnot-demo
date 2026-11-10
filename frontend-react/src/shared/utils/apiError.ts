/**
 * API Error normalization utilities
 * Converts various error types into a standardized ApiError format
 */

import { type ApiError, ERROR_CODES } from '@api/api.types'

/**
 * Normalize any error into an ApiError
 */
export function normalizeError(error: unknown): ApiError {
  const timestamp = new Date().toISOString()


  if (isApiErrorLike(error)) {
    return {
      status: error.status ?? 500,
      code: error.code ?? ERROR_CODES.UNKNOWN,
      message: error.message,
      details: error.details === undefined ? undefined : normalizeFieldErrors(error.details),
      retryAt: error.retryAt,
      timestamp: error.timestamp ?? timestamp,
    }
  }


  if (error instanceof Error) {
    return {
      status: 500,
      code: ERROR_CODES.UNKNOWN,
      message: error.message,
      timestamp,
    }
  }


  if (typeof error === 'string') {
    return {
      status: 500,
      code: ERROR_CODES.UNKNOWN,
      message: error,
      timestamp,
    }
  }


  // No transport text: the UI picks translated copy from the status and code.
  return {
    status: 500,
    code: ERROR_CODES.UNKNOWN,
    message: '',
    timestamp,
  }
}

/**
 * Type guard for ApiError-like objects
 */
function isApiErrorLike(error: unknown): error is Partial<ApiError> & { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: ApiError): boolean {
  return (
    error.status === 401 ||
    error.code === ERROR_CODES.UNAUTHORIZED ||
    error.code === ERROR_CODES.TOKEN_EXPIRED ||
    error.code === ERROR_CODES.TOKEN_INVALID
  )
}

/**
 * Check if error is a network/connectivity error
 */
export function isNetworkError(error: ApiError): boolean {
  return (
    error.status === 0 ||
    error.code === ERROR_CODES.NETWORK_ERROR ||
    error.code === ERROR_CODES.TIMEOUT
  )
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: ApiError): boolean {
  return (
    error.status === 400 ||
    error.status === 422 ||
    error.code === ERROR_CODES.VALIDATION_ERROR ||
    error.code === ERROR_CODES.INVALID_INPUT
  )
}

/**
 * Extract field errors from an ApiError
 */
export function getFieldErrors(error: ApiError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}

  if (error.details) {
    for (const [field, messages] of Object.entries(error.details)) {
      if (Array.isArray(messages) && messages.length > 0) {
        fieldErrors[field] = messages[0] ?? ''
      }
    }
  }

  return fieldErrors
}

/**
 * The backend sends validation details as a list of { field, message } objects;
 * older payloads use a map of messages. Both become a map of string arrays.
 */
export function normalizeFieldErrors(details: unknown): Record<string, string[]> {
  if (Array.isArray(details)) {
    return details.reduce<Record<string, string[]>>((result, item) => {
      if (typeof item !== 'object' || item === null) return result
      const record = item as Record<string, unknown>
      const field = typeof record.field === 'string' ? record.field : 'general'
      const message = typeof record.message === 'string' ? record.message : 'Invalid value'
      result[field] = [...(result[field] ?? []), message]
      return result
    }, {})
  }

  if (typeof details === 'object' && details !== null) {
    return Object.entries(details).reduce<Record<string, string[]>>((result, [field, value]) => {
      result[field] = Array.isArray(value)
        ? value.map(String)
        : [String(value)]
      return result
    }, {})
  }

  return { general: [String(details)] }
}
