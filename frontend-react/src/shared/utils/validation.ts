/**
 * Validation utility functions
 *
 * Includes helpers for:
 * - Basic validation checks
 * - Zod schema integration
 * - Form field error handling
 */

import { type ZodSchema, type ZodError } from 'zod'



/**
 * Field errors map type
 */
export type FieldErrors = Record<string, string | undefined>

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors: FieldErrors
}

/**
 * Validate data against a Zod schema
 * Returns a structured result with field-level errors
 */
export function validateWithSchema<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data)

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: {},
    }
  }

  return {
    success: false,
    errors: formatZodErrors(result.error),
  }
}

/**
 * Format Zod errors into a field errors map
 * Returns the first error message for each field
 */
export function formatZodErrors(error: ZodError): FieldErrors {
  const errors: FieldErrors = {}

  for (const issue of error.issues) {
    const path = issue.path.join('.')

    if (!errors[path]) {
      errors[path] = issue.message
    }
  }

  return errors
}

/**
 * Get all errors for a field from a ZodError
 */
export function getZodFieldErrors(error: ZodError, field: string): string[] {
  return error.issues
    .filter((issue) => issue.path.join('.') === field)
    .map((issue) => issue.message)
}

/**
 * Create a validation function from a Zod schema
 * Returns undefined if valid, or the first error message if invalid
 */
export function createFieldValidator<T>(
  schema: ZodSchema<T>,
  field: keyof T & string
): (value: unknown) => string | undefined {
  return (value: unknown) => {

    const data = { [field]: value }
    const result = schema.safeParse(data)

    if (result.success) {
      return undefined
    }


    const fieldError = result.error.issues.find(
      (issue) => issue.path[0] === field
    )

    return fieldError?.message
  }
}

/**
 * Trim string values in an object
 */
export function trimFormData<T extends Record<string, unknown>>(data: T): T {
  const trimmed = { ...data }

  for (const key in trimmed) {
    const value = trimmed[key]
    if (typeof value === 'string') {
      (trimmed as Record<string, unknown>)[key] = value.trim()
    }
  }

  return trimmed
}




/**
 * Check if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a string is a valid phone number (basic check)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-+()]{7,20}$/
  return phoneRegex.test(phone)
}

/**
 * Check if a password meets minimum requirements
 */
export function isValidPassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if a value is within a range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

/**
 * Check if a string length is within a range
 */
export function isLengthInRange(
  str: string,
  min: number,
  max: number
): boolean {
  return str.length >= min && str.length <= max
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Check if a year is valid (wine vintage)
 */
export function isValidVintage(year: number): boolean {
  const currentYear = new Date().getFullYear()
  return year >= 1900 && year <= currentYear
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(
  latitude: number,
  longitude: number
): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

/**
 * Sanitize a string for safe display
 */
export function sanitize(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Get validation error message for a field
 */
export function getFieldError(
  errors: Record<string, string[]>,
  field: string
): string | undefined {
  return errors[field]?.[0]
}

/**
 * Check if a string is non-empty (not null, undefined, or whitespace only)
 */
export function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) {
    return false
  }
  return value.trim().length > 0
}

