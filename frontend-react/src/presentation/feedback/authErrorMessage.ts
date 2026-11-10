import type { TFunction } from 'i18next'
import { AuthApiError, AuthValidationError } from '@services/auth.service'

type AuthOperation = 'login' | 'register' | 'social' | 'account'

const businessMessages = new Map<string, string>([
  ['AUTH_FAILED', 'invalidCredentials'],
  ['EMAIL_NOT_VERIFIED', 'emailNotVerified'],
  ['ACCOUNT_LOCKED', 'accountRestricted'],
  ['ACCOUNT_DISABLED', 'accountRestricted'],
  ['ACCOUNT_DEACTIVATED', 'accountDeactivated'],
  ['ACCOUNT_TEMPORARILY_LOCKED', 'temporarilyLocked'],
  ['EMAIL_ALREADY_EXISTS', 'emailTaken'],
  ['USERNAME_ALREADY_EXISTS', 'usernameTaken'],
  ['TERMS_VERSION_CHANGED', 'termsChanged'],
  ['SOCIAL_EMAIL_REQUIRED', 'socialEmailRequired'],
  ['INVALID_OR_EXPIRED_TOKEN', 'invalidLink'],
  ['INVALID_EMAIL_CHANGE_TOKEN', 'invalidLink'],
])

/** Only curated, localized copy reaches the UI; transport messages remain diagnostic data. */
export function authErrorMessage(error: unknown, t: TFunction, operation: AuthOperation): string {
  let key = operation === 'social' ? 'social' : 'unexpected'
  if (error instanceof AuthValidationError) {
    key = 'validation'
  } else if (error instanceof AuthApiError) {
    const businessKey = businessMessages.get(error.code ?? '')
    if (businessKey) key = businessKey
    else if (error.code === 'TIMEOUT' || error.statusCode === 408 || error.statusCode === 504) key = 'timeout'
    else if (error.statusCode === 0) key = 'connection'
    else if (error.statusCode === 429) key = 'tooManyAttempts'
    else if (error.statusCode >= 500) key = 'unavailable'
    else if (error.statusCode === 401 && operation === 'login') key = 'invalidCredentials'
    else if (error.statusCode === 403) key = 'requestBlocked'
    else if (error.statusCode === 400 || error.statusCode === 422) key = 'validation'
    else if (error.statusCode === 409 && operation === 'register') key = 'registrationConflict'
  }
  return t(`auth.errors.${key}`)
}
