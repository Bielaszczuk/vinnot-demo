import type { TFunction } from 'i18next'
import { normalizeError } from '@shared/utils/apiError'

/** Localized copy for a failed email change request; the server text never reaches the UI. */
export function emailChangeErrorMessage(error: unknown, t: TFunction): string {
  return normalizeError(error).code === 'EMAIL_ALREADY_EXISTS'
    ? t('profile.emailChangeTaken')
    : t('profile.toastEmailChangeError')
}
