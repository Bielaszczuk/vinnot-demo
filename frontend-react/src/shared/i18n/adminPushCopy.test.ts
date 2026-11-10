import { describe, expect, it } from 'vitest'
import es from './locales/es-AR.json'
import en from './locales/en-US.json'
import { PUSH_OUTCOMES } from '@domain/admin/pushAdministration'

/** The engagement push types (#405) the admin push screens name. */
const ENGAGEMENT_TYPES = [
  'TASTE_PICK', 'ROUTE_PICK', 'VIEWED_NOT_RATED', 'CELLAR_CHECKIN', 'WEEKEND_EVENTS',
  'WINERY_PICK', 'ONBOARDING', 'WINBACK', 'MILESTONE', 'POST_EVENT',
]

type Tree = { [key: string]: string | Tree }
const at = (tree: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree)

describe.each([['es-AR', es], ['en-US', en]] as const)('%s admin push copy', (_locale, copy) => {
  it('names every engagement push type and every outcome', () => {
    ENGAGEMENT_TYPES.forEach((type) => expect(at(copy, `admin.notifications.pushTypes.${type}`)).toEqual(expect.any(String)))
    PUSH_OUTCOMES.forEach((outcome) => expect(at(copy, `admin.notifications.metrics.outcomes.${outcome}`)).toEqual(expect.any(String)))
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
