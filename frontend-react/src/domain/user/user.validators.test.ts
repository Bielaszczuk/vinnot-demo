import { describe, expect, it } from 'vitest'
import {
  changePasswordSchema,
  emailActionSchema,
  loginUserSchema,
  priceRangeSchema,
  registerUserSchema,
  resetPasswordSchema,
  usernameSchema,
} from './user.validators'

describe('user validators', () => {
  it('normalizes valid usernames and enforces boundary characters', () => {
    expect(usernameSchema.parse('  Wine.User  ')).toBe('wine.user')
    expect(usernameSchema.safeParse('_invalid').success).toBe(false)
  })

  it('requires strong matching registration passwords', () => {
    const valid = {
      username: 'wine.user', email: 'wine@example.com', password: 'Password1',
      confirmPassword: 'Password1', firstName: 'Wine', lastName: 'User',
    }
    expect(registerUserSchema.safeParse(valid).success).toBe(true)
    expect(registerUserSchema.safeParse({ ...valid, confirmPassword: 'Other1A' }).success)
      .toBe(false)
  })

  it('rejects inverted prices and mismatched password changes', () => {
    expect(priceRangeSchema.safeParse({ min: 20, max: 10 }).success).toBe(false)
    expect(changePasswordSchema.safeParse({
      currentPassword: 'old', newPassword: 'Password1', confirmNewPassword: 'Password2',
    }).success).toBe(false)
    expect(resetPasswordSchema.safeParse({
      password: 'Password1', confirmPassword: 'Password2',
    }).success).toBe(false)
  })

  it('reports i18n keys instead of English text so the interface translates them', () => {
    const messages = (result: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
      result.error?.issues.map((issue) => issue.message) ?? []
    expect(messages(usernameSchema.safeParse('ab'))).toContain('auth.usernameMinLength')
    expect(messages(usernameSchema.safeParse('a'.repeat(41)))).toContain('auth.usernameMaxLength')
    expect(messages(usernameSchema.safeParse('_invalid'))).toEqual(['auth.usernameInvalid'])
    expect(messages(emailActionSchema.safeParse({ email: 'nope' }))).toEqual(['auth.invalidEmail'])
    expect(messages(loginUserSchema.safeParse({ email: 'wine@example.com', password: '' }))).toEqual(['auth.passwordRequired'])
    expect(messages(resetPasswordSchema.safeParse({ password: 'short', confirmPassword: 'short' }))).toEqual([
      'auth.passwordMinLength', 'auth.passwordUppercase', 'auth.passwordNumber',
    ])
    expect(messages(resetPasswordSchema.safeParse({ password: 'Password1', confirmPassword: 'Password2' })))
      .toEqual(['auth.passwordsMismatch'])
    expect(messages(registerUserSchema.safeParse({
      username: 'wine.user', email: 'wine@example.com', password: 'Password1', confirmPassword: 'Password1',
      firstName: '', lastName: 'x'.repeat(101),
    }))).toEqual(['auth.firstNameRequired', 'auth.lastNameTooLong'])
    expect(messages(changePasswordSchema.safeParse({
      currentPassword: '', newPassword: 'password1', confirmNewPassword: 'password1',
    }))).toEqual(['auth.currentPasswordRequired', 'auth.passwordUppercase'])
  })

  it('still accepts and rejects the same inputs', () => {
    expect(usernameSchema.safeParse('abc').success).toBe(true)
    expect(usernameSchema.safeParse('a'.repeat(40)).success).toBe(true)
    expect(usernameSchema.safeParse('wine-user_1').success).toBe(true)
    expect(usernameSchema.safeParse('wine user').success).toBe(false)
    expect(loginUserSchema.safeParse({ email: 'wine@example.com', password: 'x' }).success).toBe(true)
    expect(resetPasswordSchema.safeParse({ password: 'Password1', confirmPassword: 'Password1' }).success).toBe(true)
    expect(resetPasswordSchema.safeParse({ password: 'PASSWORD1', confirmPassword: 'PASSWORD1' }).success).toBe(false)
  })
})
