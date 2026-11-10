import type { TFunction } from 'i18next'
import { normalizeError } from '@shared/utils/apiError'

const MESSAGES_BY_CODE: Record<string, string> = {
  USERNAME_ALREADY_EXISTS: 'auth.errors.usernameTaken',
  EMAIL_ALREADY_EXISTS: 'auth.errors.emailTaken',
  DUPLICATE_ENTRY: 'errors.api.duplicate',
  ALREADY_EXISTS: 'errors.api.duplicate',
  CONCURRENT_UPDATE: 'errors.api.concurrentUpdate',
  TIMEOUT: 'errors.api.timeout',
  NETWORK_ERROR: 'errors.api.network',
  ORGANIZER_HAS_UPCOMING_PAID_EVENTS: 'profile.toastDeleteBlockedByPaidEvents',
}

const MESSAGES_BY_STATUS: Record<number, string> = {
  0: 'errors.api.network',
  400: 'errors.api.validation',
  401: 'errors.api.session',
  403: 'errors.api.forbidden',
  404: 'errors.api.notFound',
  408: 'errors.api.timeout',
  409: 'errors.api.conflict',
  422: 'errors.api.validation',
  429: 'errors.api.rateLimit',
  502: 'errors.api.unavailable',
  503: 'errors.api.unavailable',
  504: 'errors.api.timeout',
}

/** Translation key for a known error code or status; `null` when only a contextual fallback fits. */
export function apiErrorKey(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null
  const { status, code } = normalizeError(error)
  return MESSAGES_BY_CODE[code] ?? MESSAGES_BY_STATUS[status] ?? null
}

/**
 * Localized copy for a failed request. Backend and transport text (for example
 * "Request failed with status code 500" or "Network Error") never reaches the UI.
 */
export function apiErrorMessage(error: unknown, t: TFunction, fallbackKey = 'errors.api.generic'): string {
  return t(apiErrorKey(error) ?? fallbackKey)
}

export type AdminSaveEntity = 'wineries' | 'wines' | 'routes'

const SAVE_ERROR_KEYS: Record<AdminSaveEntity, string> = {
  wineries: 'admin.common.toastSaveError',
  wines: 'admin.wines.toastSaveError',
  routes: 'admin.routes.toastSaveError',
}

/** Admin save failure copy: per-entity message with the translated reason, or a human fallback. */
export function adminSaveErrorMessage(error: unknown, t: TFunction, entity: AdminSaveEntity): string {
  const reason = apiErrorKey(error)
  return reason
    ? t(SAVE_ERROR_KEYS[entity], { message: t(reason), interpolation: { escapeValue: false } })
    : t('admin.common.saveErrorFallback')
}
