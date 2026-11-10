/**
 * String utility functions
 */

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Capitalize each word in a string
 */
export function capitalizeWords(str: string): string {
  if (!str) return ''
  return str
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ')
}

/**
 * Convert a string to slug format
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (!str || str.length <= maxLength) return str
  return str.slice(0, maxLength - suffix.length).trim() + suffix
}

/**
 * Remove HTML tags from a string
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  const escapeChars: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return str.replace(/[&<>"']/g, (char) => escapeChars[char] ?? char)
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string, maxLength = 2): string {
  if (!name) return ''
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, maxLength)
    .join('')
}

/**
 * Check if a string is empty or whitespace only
 */
export function isBlank(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim()
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(str: string): string {
  return str
    .split('_')
    .map((word) => capitalize(word))
    .join(' ')
}

/**
 * Pluralize a word based on count
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  if (count === 1) return singular
  return plural || `${singular}s`
}

