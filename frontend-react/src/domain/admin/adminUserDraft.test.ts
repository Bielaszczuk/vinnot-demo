import { expect, it } from 'vitest'
import {
  ADMIN_USER_NAME_MAX_LENGTH,
  isAdminUserUpdateEmpty,
  toAdminUserDraft,
  toAdminUserUpdate,
  validateAdminUserDraft,
} from './adminUserDraft'

const user = { firstName: 'Ana', lastName: 'Pérez' }

it('starts from the stored names', () => {
  expect(toAdminUserDraft(user)).toEqual({ firstName: 'Ana', lastName: 'Pérez' })
  expect(toAdminUserDraft({ firstName: null, lastName: undefined })).toEqual({ firstName: '', lastName: '' })
})

it('rejects names longer than the backend column, measured after trimming', () => {
  expect(ADMIN_USER_NAME_MAX_LENGTH).toBe(100)
  expect(validateAdminUserDraft({ firstName: 'a'.repeat(101), lastName: 'b' })).toEqual([
    { field: 'firstName', code: 'tooLong' },
  ])
  expect(validateAdminUserDraft({ firstName: 'Ana', lastName: 'b'.repeat(101) })).toEqual([
    { field: 'lastName', code: 'tooLong' },
  ])
  expect(validateAdminUserDraft({ firstName: ` ${'a'.repeat(100)} `, lastName: 'b'.repeat(100) })).toEqual([])
  expect(validateAdminUserDraft(toAdminUserDraft(user))).toEqual([])
})

it('sends nothing when unchanged and both names together otherwise, so PATCH keeps the rest', () => {
  expect(toAdminUserUpdate(user, toAdminUserDraft(user))).toEqual({})
  expect(toAdminUserUpdate(user, { firstName: ' Ana ', lastName: 'Pérez ' })).toEqual({})
  expect(toAdminUserUpdate(user, { firstName: ' Ana María ', lastName: 'Pérez' })).toEqual({
    firstName: 'Ana María',
    lastName: 'Pérez',
  })
  expect(toAdminUserUpdate({ firstName: null, lastName: null }, { firstName: 'Luz', lastName: '' })).toEqual({
    firstName: 'Luz',
    lastName: '',
  })
})

it('tells an empty update apart from one that carries the names', () => {
  expect(isAdminUserUpdateEmpty({})).toBe(true)
  expect(isAdminUserUpdateEmpty({ firstName: 'Luz', lastName: '' })).toBe(false)
})
