import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { emailChangeErrorMessage } from './emailChangeErrorMessage'

const t = ((key: string) => key) as unknown as TFunction

describe('emailChangeErrorMessage', () => {
  it('says the address belongs to another account instead of the server text', () => {
    const error = { status: 409, code: 'EMAIL_ALREADY_EXISTS', message: 'A user with this email already exists' }
    expect(emailChangeErrorMessage(error, t)).toBe('profile.emailChangeTaken')
  })

  it('falls back to the generic copy for any other failure', () => {
    expect(emailChangeErrorMessage({ status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }, t))
      .toBe('profile.toastEmailChangeError')
    expect(emailChangeErrorMessage(new Error('Network Error'), t)).toBe('profile.toastEmailChangeError')
  })
})
