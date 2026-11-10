export const NOTIFICATION_CATEGORIES = [
  'ACCOUNT', 'SECURITY', 'PAYMENTS', 'TICKETS',
  'EVENTS_NEARBY', 'COMMUNITY', 'RECOMMENDATIONS', 'REMINDERS', 'NEWSLETTER',
] as const

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]
export type NotificationCategoryKind = 'TRANSACTIONAL' | 'OPTIONAL' | 'PROMOTIONAL'
export type NotificationChannel = 'email' | 'push'

export interface NotificationPreference {
  category: NotificationCategory
  kind: NotificationCategoryKind
  email: boolean
  push: boolean
  editable: boolean
  /** The category sends messages on this channel; otherwise there is nothing to switch. */
  emailAvailable: boolean
  pushAvailable: boolean
}

export interface MarketingConsent {
  granted: boolean
  decidedAt: string | null
  source: string | null
}

export interface NotificationPreferences {
  marketingConsent: MarketingConsent
  categories: NotificationPreference[]
}

export function isNotificationCategory(value: string): value is NotificationCategory {
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value)
}

/** Transactional categories never change; promotional ones wait for marketing consent. */
export function canChange(preference: NotificationPreference, consentGranted: boolean): boolean {
  if (!preference.editable || preference.kind === 'TRANSACTIONAL') return false
  return preference.kind !== 'PROMOTIONAL' || consentGranted
}

export function isChannelAvailable(preference: NotificationPreference, channel: NotificationChannel): boolean {
  return channel === 'email' ? preference.emailAvailable : preference.pushAvailable
}

export function isMarketingConsentChange(current: boolean, next: boolean): boolean {
  return current !== next
}
