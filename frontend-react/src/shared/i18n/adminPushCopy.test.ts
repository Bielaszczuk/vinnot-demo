import { describe, expect, it } from 'vitest'
import es from './locales/es-AR.json'
import en from './locales/en-US.json'
import { PUSH_OUTCOMES } from '@domain/admin/pushAdministration'

/** The engagement push types (#405) the admin push screens name. */
const ENGAGEMENT_TYPES = [
  'TASTE_PICK', 'ROUTE_PICK', 'VIEWED_NOT_RATED', 'CELLAR_CHECKIN', 'WEEKEND_EVENTS',
  'WINERY_PICK', 'ONBOARDING', 'WINBACK', 'MILESTONE', 'POST_EVENT',
]

/** Every type with a backend push template (backend notification/infrastructure/push/*Template.java). */
const BACKEND_PUSH_TYPES = [
  'ANNOUNCEMENT_TEST', 'CELLAR_CHECKIN', 'EVENT_CANCELLED_ATTENDEE', 'EVENT_CHANGED_ATTENDEE', 'EVENT_NEARBY',
  'EVENT_REGISTRATION_ATTENDEE', 'EVENT_REGISTRATION_ORGANIZER', 'EVENT_REMINDER', 'MILESTONE', 'NEW_FOLLOWER',
  'NEWSLETTER', 'ONBOARDING', 'PAYMENT_ACCOUNT_RECONNECT_REQUIRED', 'PAYMENT_CHARGEBACK', 'POST_EVENT',
  'REVIEW_COMMENT', 'REVIEW_LIKES_DAILY', 'ROUTE_PICK', 'SERVICE_NOTICE', 'SOCIAL_ACCOUNT_RECONNECT',
  'SOCIAL_BATCH_READY', 'SOCIAL_POST_FAILED', 'SOCIAL_TIKTOK_DRAFT_WAITING', 'TASTE_PICK', 'TIER_REACHED',
  'VIEWED_NOT_RATED', 'WEEKEND_EVENTS', 'WINBACK', 'WINE_RECOMMENDATION', 'WINERY_PICK',
]

type Tree = { [key: string]: string | Tree }
const at = (tree: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree)

describe.each([['es-AR', es], ['en-US', en]] as const)('%s admin push copy', (_locale, copy) => {
  it('names every engagement push type and every outcome', () => {
    ENGAGEMENT_TYPES.forEach((type) => expect(at(copy, `admin.notifications.pushTypes.${type}`)).toEqual(expect.any(String)))
    PUSH_OUTCOMES.forEach((outcome) => expect(at(copy, `admin.notifications.metrics.outcomes.${outcome}`)).toEqual(expect.any(String)))
  })

  it('names every backend push type, so the admin switches never show a raw type', () => {
    BACKEND_PUSH_TYPES.forEach((type) => expect(at(copy, `admin.notifications.pushTypes.${type}`)).toEqual(expect.any(String)))
  })

  it('explains the engagement panel', () => {
    ['heading', 'help', 'empty', 'sent', 'opened', 'openRate', 'optedOut', 'state', 'paused', 'active']
      .forEach((key) => expect(at(copy, `admin.notifications.engagement.${key}`)).toEqual(expect.any(String)))
  })

  it('names the reminders category', () => {
    expect(at(copy, 'notificationPreferences.categories.REMINDERS.name')).toEqual(expect.any(String))
    expect(at(copy, 'notificationPreferences.categories.REMINDERS.description')).toEqual(expect.any(String))
  })
})

it('words the reminders category like the app', () => {
  expect(es.notificationPreferences.categories).toMatchObject({
    REMINDERS: { name: 'Recordatorios', description: 'Vinos que miraste, tu bodega y tus eventos.' },
  })
  expect(en.notificationPreferences.categories).toMatchObject({
    REMINDERS: { name: 'Reminders', description: 'Wines you viewed, your cellar and your events.' },
  })
})

it('words the newer push types in each language', () => {
  expect(es.admin.notifications.pushTypes).toMatchObject({
    NEW_FOLLOWER: 'Nuevo seguidor', TIER_REACHED: 'Nuevo nivel alcanzado', SOCIAL_ACCOUNT_RECONNECT: 'Reconectar red social',
    SOCIAL_BATCH_READY: 'Lote de publicaciones listo', SOCIAL_POST_FAILED: 'Publicación fallida',
    SOCIAL_TIKTOK_DRAFT_WAITING: 'Borrador de TikTok pendiente',
  })
  expect(en.admin.notifications.pushTypes).toMatchObject({
    NEW_FOLLOWER: 'New follower', TIER_REACHED: 'New tier reached', SOCIAL_ACCOUNT_RECONNECT: 'Reconnect social account',
    SOCIAL_BATCH_READY: 'Post batch ready', SOCIAL_POST_FAILED: 'Post failed', SOCIAL_TIKTOK_DRAFT_WAITING: 'TikTok draft waiting',
  })
})
