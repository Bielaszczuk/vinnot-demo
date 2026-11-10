import { describe, expect, it } from 'vitest'
import {
  changePasswordSchema,
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
})
