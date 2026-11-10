import { z } from 'zod'

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,38}[a-z0-9])$/

export const usernameSchema = z.string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(40, 'Username must be at most 40 characters')
  .regex(
    USERNAME_PATTERN,
    'Use letters, numbers, dots, hyphens or underscores, starting and ending with a letter or number',
  )

/**
 * User role enum schema matching RBAC system
 */
export const userRoleSchema = z.enum(['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_PARTNER', 'ROLE_USER'])

/**
 * Theme enum schema
 */
export const themeSchema = z.enum(['light', 'dark', 'system'])

/**
 * Price range schema
 */
export const priceRangeSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0),
}).refine((data) => data.max >= data.min, {
  message: 'Max price must be greater than or equal to min price',
  path: ['max'],
})

/**
 * Notification preferences schema
 */
export const notificationPreferencesSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(false),
  events: z.boolean().default(true),
  recommendations: z.boolean().default(true),
  newsletter: z.boolean().default(false),
})

/**
 * User preferences schema
 */
export const userPreferencesSchema = z.object({
  favoriteWineTypes: z.array(z.string()).default([]),
  favoriteRegions: z.array(z.string()).default([]),
  priceRange: priceRangeSchema.nullable(),
  notifications: notificationPreferencesSchema,
  locale: z.string().default('es-AR'),
  theme: themeSchema.default('system'),
})

/**
 * User schema for validation
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100),
  avatar: z.string().url().nullable(),
  roles: z.array(userRoleSchema).default(['ROLE_USER']),
  preferences: userPreferencesSchema,
  isVerified: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * User registration schema
 */
export const registerUserSchema = z.object({
  username: usernameSchema,
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/**
 * User login schema
 */
export const loginUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const emailActionSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/**
 * Update user profile schema
 */
export const updateUserProfileSchema = z.object({
  username: usernameSchema.optional(),
  name: z.string().min(1, 'Name is required').max(100).optional(),
  avatar: z.string().url().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
})

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
})

export type RegisterUserInput = z.infer<typeof registerUserSchema>
export type LoginUserInput = z.infer<typeof loginUserSchema>
export type EmailActionInput = z.infer<typeof emailActionSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>
