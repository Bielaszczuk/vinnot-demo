import { describe, expect, it } from 'vitest'
import { createInstance } from 'i18next'
import { AuthApiError, AuthValidationError } from '@services/auth.service'
import es from '@i18n/locales/es-AR.json'
import en from '@i18n/locales/en-US.json'
import { authErrorMessage } from './authErrorMessage'

const cases = [
  [0, undefined, 'connection'], [0, 'TIMEOUT', 'timeout'], [408, undefined, 'timeout'],
  [504, undefined, 'timeout'], [429, undefined, 'tooManyAttempts'],
  [500, undefined, 'unavailable'], [502, undefined, 'unavailable'], [503, undefined, 'unavailable'],
  [401, undefined, 'invalidCredentials'], [403, undefined, 'requestBlocked'],
  [400, undefined, 'validation'], [422, undefined, 'validation'], [404, undefined, 'unexpected'],
  [401, 'AUTH_FAILED', 'invalidCredentials'], [403, 'EMAIL_NOT_VERIFIED', 'emailNotVerified'],
  [403, 'ACCOUNT_LOCKED', 'accountRestricted'], [403, 'ACCOUNT_DISABLED', 'accountRestricted'],
  [403, 'ACCOUNT_DEACTIVATED', 'accountDeactivated'], [409, 'EMAIL_ALREADY_EXISTS', 'emailTaken'],
  [409, 'USERNAME_ALREADY_EXISTS', 'usernameTaken'], [409, 'TERMS_VERSION_CHANGED', 'termsChanged'],
  [400, 'SOCIAL_EMAIL_REQUIRED', 'socialEmailRequired'], [400, 'INVALID_OR_EXPIRED_TOKEN', 'invalidLink'],
  [400, 'INVALID_EMAIL_CHANGE_TOKEN', 'invalidLink'], [423, 'ACCOUNT_TEMPORARILY_LOCKED', 'temporarilyLocked'],
] as const

for (const [locale, translations] of [['es-AR', es], ['en-US', en]] as const) {
  describe(locale, () => {
    const i18n = createInstance()
    void i18n.init({ lng: locale, resources: { [locale]: { translation: translations } }, initAsync: false })
    it.each(cases)('maps status %s / code %s to %s without exposing diagnostics', (status, code, key) => {
      const diagnostic = '<html>Request failed with status code 403; SQL connection refused</html>'
      const error = new AuthApiError(diagnostic, status, false, code)
      expect(authErrorMessage(error, i18n.t, 'login')).toBe(translations.auth.errors[key])
      expect(error.message).toBe(diagnostic)
    })
    it('uses safe context-specific fallbacks and validation messages', () => {
      expect(authErrorMessage(new Error('Apple SDK technical failure'), i18n.t, 'social')).toBe(translations.auth.errors.social)
      expect(authErrorMessage(null, i18n.t, 'login')).toBe(translations.auth.errors.unexpected)
      expect(authErrorMessage(new AuthApiError('conflict', 409), i18n.t, 'register')).toBe(translations.auth.errors.registrationConflict)
      expect(authErrorMessage(new AuthApiError('unauthorized', 401), i18n.t, 'account')).toBe(translations.auth.errors.unexpected)
      expect(authErrorMessage(new AuthValidationError('raw validation'), i18n.t, 'register')).toBe(translations.auth.errors.validation)
    })
  })
}
