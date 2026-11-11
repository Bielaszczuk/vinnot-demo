import type { TFunction } from 'i18next'
import { expect, it } from 'vitest'
import { fieldErrorMessage } from './fieldErrorMessage'

const t = ((key: string) => `translated:${key}`) as unknown as TFunction

it('translates the key a form error carries and shows nothing without one', () => {
  expect(fieldErrorMessage(t, { message: 'auth.invalidEmail' })).toBe('translated:auth.invalidEmail')
  expect(fieldErrorMessage(t, { message: '' })).toBeUndefined()
  expect(fieldErrorMessage(t, undefined)).toBeUndefined()
})
