import { expect, it } from 'vitest'
import { getFieldErrors, normalizeError, normalizeFieldErrors } from './apiError'

it('maps the backend validation list into field errors', () => {
  const error = normalizeError({
    status: 400,
    message: 'Validation failed',
    details: [
      { field: 'name', message: 'must not be blank' },
      { field: 'name', message: 'is too short' },
      { message: 'missing field' },
    ],
  })
  expect(error.details).toEqual({
    name: ['must not be blank', 'is too short'],
    general: ['missing field'],
  })
  expect(getFieldErrors(error)).toEqual({ name: 'must not be blank', general: 'missing field' })
})

it('keeps map-shaped details and leaves absent details undefined', () => {
  expect(normalizeFieldErrors({ email: ['taken'], age: 3 })).toEqual({ email: ['taken'], age: ['3'] })
  expect(normalizeFieldErrors('oops')).toEqual({ general: ['oops'] })
  expect(normalizeError({ status: 409, message: 'Conflict' }).details).toBeUndefined()
})

it('never invents English copy for errors without a message', () => {
  expect(normalizeError(42)).toMatchObject({ status: 500, code: 'UNKNOWN', message: '' })
  expect(normalizeError({ status: 404, message: 'Not found' })).toMatchObject({ status: 404, message: 'Not found' })
})
