import { describe, expect, it } from 'vitest'
import {
  canChange,
  isChannelAvailable,
  isMarketingConsentChange,
  type NotificationPreference,
} from './notificationPreferences'

const preference = (overrides: Partial<NotificationPreference>): NotificationPreference => ({
  category: 'EVENTS_NEARBY', kind: 'OPTIONAL', email: true, push: true, editable: true,
  emailAvailable: true, pushAvailable: true, ...overrides,
})

describe('notification preferences', () => {
  it('never lets a transactional category change', () => {
    expect(canChange(preference({ category: 'SECURITY', kind: 'TRANSACTIONAL', editable: false }), true)).toBe(false)
  })

  it('lets optional categories change without marketing consent', () => {
    expect(canChange(preference({}), false)).toBe(true)
  })

  it('locks promotional categories until marketing consent is granted', () => {
    const newsletter = preference({ category: 'NEWSLETTER', kind: 'PROMOTIONAL', email: false, push: false })
    expect(canChange(newsletter, false)).toBe(false)
    expect(canChange(newsletter, true)).toBe(true)
  })

  it('recognises a consent change only when the decision differs', () => {
    expect(isMarketingConsentChange(false, true)).toBe(true)
    expect(isMarketingConsentChange(true, true)).toBe(false)
  })
})

it('tells which channels a category actually sends on', () => {
  const pushOnly = preference({ category: 'RECOMMENDATIONS', emailAvailable: false, pushAvailable: true })
  expect(isChannelAvailable(pushOnly, 'email')).toBe(false)
  expect(isChannelAvailable(pushOnly, 'push')).toBe(true)
  const emailOnly = preference({ category: 'NEWSLETTER', emailAvailable: true, pushAvailable: false })
  expect(isChannelAvailable(emailOnly, 'email')).toBe(true)
  expect(isChannelAvailable(emailOnly, 'push')).toBe(false)
})
