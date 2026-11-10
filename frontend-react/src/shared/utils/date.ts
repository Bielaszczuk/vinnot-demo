/**
 * Date utility functions. Without an explicit locale they follow the app
 * language (`currentLocale`).
 */

import { currentLocale } from './locale'

/**
 * Format a date to a localized string
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale: string = currentLocale()
): string {
  const d = new Date(date)
  return d.toLocaleDateString(locale, options ?? {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a date to a short string (dd/mm/yyyy)
 */
export function formatDateShort(date: Date | string | number, locale: string = currentLocale()): string {
  const d = new Date(date)
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Format a date with time
 */
export function formatDateTime(
  date: Date | string | number,
  locale: string = currentLocale()
): string {
  const d = new Date(date)
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format time only
 */
export function formatTime(
  date: Date | string | number,
  locale: string = currentLocale()
): string {
  const d = new Date(date)
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format an event start: short weekday, day, short month and time
 */
export function formatEventDate(
  date: Date | string | number,
  locale: string = currentLocale()
): string {
  return new Date(date).toLocaleString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: string = currentLocale()
): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (diffDay > 30) {
    return formatDate(d, undefined, locale)
  } else if (diffDay > 0) {
    return rtf.format(-diffDay, 'day')
  } else if (diffHour > 0) {
    return rtf.format(-diffHour, 'hour')
  } else if (diffMin > 0) {
    return rtf.format(-diffMin, 'minute')
  } else {
    return rtf.format(-diffSec, 'second')
  }
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string | number): boolean {
  const d = new Date(date)
  const today = new Date()
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  return new Date(date) < new Date()
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string | number): boolean {
  return new Date(date) > new Date()
}

/**
 * Get the start of day for a date
 */
export function startOfDay(date: Date | string | number): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the end of day for a date
 */
export function endOfDay(date: Date | string | number): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

