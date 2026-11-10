import i18next from 'i18next'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { formatDate, formatDateShort, formatDateTime, formatEventDate, formatRelativeTime, formatTime } from './date'
import { formatCurrency, formatDecimal, formatNumber, formatPercent, formatPrice } from './format'
import { currentLocale } from './locale'

const when = new Date(2026, 2, 14, 19, 30)

beforeEach(async () => {
  await i18next.init({ lng: 'es-AR', resources: {} })
})

afterEach(async () => {
  await i18next.changeLanguage('es-AR')
})

it('reads the app language, falling back to Spanish (Argentina)', async () => {
  expect(currentLocale()).toBe('es-AR')
  await i18next.changeLanguage('en-US')
  expect(currentLocale()).toBe('en-US')
})

it('formats dates and times in the app language by default', async () => {
  expect(formatDate(when)).toBe(when.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' }))
  await i18next.changeLanguage('en-US')
  expect(formatDate(when)).toBe('March 14, 2026')
  expect(formatDateShort(when)).toBe('03/14/2026')
  expect(formatTime(when)).toBe(when.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
  expect(formatDateTime(when)).toBe(when.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }))
  expect(formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000))).toBe('2 hours ago')
  expect(formatDate(when, { month: 'short' }, 'es-AR')).toBe(when.toLocaleDateString('es-AR', { month: 'short' }))
})

it('formats an event start with weekday, day, month and time', async () => {
  await i18next.changeLanguage('en-US')
  expect(formatEventDate(when)).toBe(when.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))
  expect(formatEventDate(when.toISOString(), 'es-AR')).toBe(when.toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))
})

it('formats prices as currency in the app language, without cents for whole amounts', async () => {
  expect(formatPrice(1500)).toBe(new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(1500))
  await i18next.changeLanguage('en-US')
  expect(formatPrice(12.5, 'USD')).toBe('$12.50')
  expect(formatPrice(20, null)).toBe(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(20))
  expect(formatCurrency(10)).toBe(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ARS' }).format(10))
  expect(formatNumber(1234)).toBe('1,234')
  expect(formatPercent(0.25)).toBe('25%')
  expect(formatDecimal(1.5)).toBe('1.50')
})
