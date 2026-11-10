import { createInstance } from 'i18next'
import { describe, expect, it } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { adminSaveErrorMessage, apiErrorKey, apiErrorMessage } from './apiErrorMessage'

async function translator(language: 'en-US' | 'es-AR') {
  const i18n = createInstance()
  await i18n.init({
    lng: language,
    resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } },
    interpolation: { escapeValue: false },
  })
  return i18n.t
}

describe('apiErrorMessage', () => {
  it.each([
    [{ status: 0, code: 'NETWORK_ERROR', message: 'Network Error' }, en.errors.api.network],
    [{ status: 0, code: 'TIMEOUT', message: 'Request timed out. Please try again.' }, en.errors.api.timeout],
    [{ status: 504, code: 'HTTP_504', message: 'Gateway Timeout' }, en.errors.api.timeout],
    [{ status: 401, code: 'UNAUTHORIZED', message: 'Unauthorized' }, en.errors.api.session],
    [{ status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' }, en.errors.api.forbidden],
    [{ status: 404, code: 'NOT_FOUND', message: 'Resource not found' }, en.errors.api.notFound],
    [{ status: 409, code: 'DUPLICATE_ENTRY', message: 'duplicate key value' }, en.errors.api.duplicate],
    [{ status: 409, code: 'CONCURRENT_UPDATE', message: 'Row was updated' }, en.errors.api.concurrentUpdate],
    [{ status: 409, code: 'HTTP_409', message: 'Conflict' }, en.errors.api.conflict],
    [{ status: 409, code: 'USERNAME_ALREADY_EXISTS', message: 'Username taken' }, en.auth.errors.usernameTaken],
    [{ status: 422, code: 'VALIDATION_ERROR', message: 'Validation failed', details: [{ field: 'name', message: 'must not be blank' }] }, en.errors.api.validation],
    [{ status: 429, code: 'RATE_LIMITED', message: 'Too many requests' }, en.errors.api.rateLimit],
    [{ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'External service unavailable' }, en.errors.api.unavailable],
    [{ status: 422, code: 'ORGANIZER_HAS_UPCOMING_PAID_EVENTS', message: 'Cancel your upcoming events' }, en.profile.toastDeleteBlockedByPaidEvents],
  ])('maps %o to translated copy and never shows the backend text', async (error, expected) => {
    const t = await translator('en-US')
    const message = apiErrorMessage(error, t)
    expect(message).toBe(expected)
    expect(message).not.toContain(error.message)
  })

  it('uses the contextual fallback for unknown failures, never transport text', async () => {
    const t = await translator('es-AR')
    expect(apiErrorMessage(new Error('Request failed with status code 500'), t, 'profile.toastPasswordSetupError'))
      .toBe(es.profile.toastPasswordSetupError)
    expect(apiErrorMessage({ status: 500, code: 'INTERNAL_ERROR', message: 'NullPointerException' }, t))
      .toBe(es.errors.api.generic)
    expect(apiErrorMessage(undefined, t)).toBe(es.errors.api.generic)
    expect(apiErrorKey('Network Error')).toBeNull()
  })
})

it.each(['wineries', 'wines', 'routes'] as const)(
  'renders the %s save error with the translated reason and no literal braces',
  async (entity) => {
    const t = await translator('en-US')
    const message = adminSaveErrorMessage({ status: 409, code: 'DUPLICATE_ENTRY', message: 'Name already exists' }, t, entity)
    expect(message).toContain(en.errors.api.duplicate)
    expect(message).not.toContain('Name already exists')
    expect(message).not.toMatch(/[{}]/)
  },
)

it.each([
  ['en-US', "We couldn't save your changes. Please try again."],
  ['es-AR', 'No pudimos guardar los cambios. Intentá nuevamente.'],
] as const)('falls back to a human message in %s when the failure is not recognised', async (language, expected) => {
  const t = await translator(language)
  expect(adminSaveErrorMessage(undefined, t, 'wines')).toBe(expected)
  expect(adminSaveErrorMessage({ status: 500, message: '' }, t, 'routes')).toBe(expected)
})
