import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { UserProfileNotificationsTab } from './UserProfileNotificationsTab'
import { notificationsService } from '@services/notifications.service'
import { regionsService } from '@services/regions.service'
import type { NotificationPreferences } from '@domain/notification/notificationPreferences'

const addToast = vi.fn()
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@services/notifications.service', () => ({
  notificationsService: {
    getPreferences: vi.fn(), setChannel: vi.fn(), setMarketingConsent: vi.fn(),
    getEventArea: vi.fn(), setEventAreaRegion: vi.fn(), clearEventArea: vi.fn(),
  },
}))
vi.mock('@services/regions.service', () => ({ regionsService: { getRegions: vi.fn() } }))

function preferences(consent: boolean, newsletterEmail = false): NotificationPreferences {
  return {
    marketingConsent: { granted: consent, decidedAt: null, source: null },
    categories: [
      { category: 'SECURITY', kind: 'TRANSACTIONAL', email: true, push: true, editable: false, emailAvailable: true, pushAvailable: true },
      { category: 'EVENTS_NEARBY', kind: 'OPTIONAL', email: true, push: true, editable: true, emailAvailable: true, pushAvailable: true },
      { category: 'NEWSLETTER', kind: 'PROMOTIONAL', email: newsletterEmail, push: false, editable: true, emailAvailable: true, pushAvailable: true },
      { category: 'RECOMMENDATIONS', kind: 'OPTIONAL', email: false, push: true, editable: true, emailAvailable: false, pushAvailable: true },
      { category: 'REMINDERS', kind: 'OPTIONAL', email: false, push: true, editable: true, emailAvailable: false, pushAvailable: true },
    ],
  }
}

const name = (category: string, channel: string) =>
  `notificationPreferences.categories.${category}.name: notificationPreferences.channels.${channel}`

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><UserProfileNotificationsTab /></QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(notificationsService.getEventArea).mockResolvedValue(null)
  vi.mocked(regionsService.getRegions).mockResolvedValue([])
})

it('shows transactional categories as always on and locks promotion until consent', async () => {
  vi.mocked(notificationsService.getPreferences).mockResolvedValue(preferences(false))
  setup()

  const security = await screen.findByRole('checkbox', { name: name('SECURITY', 'email') })
  expect(security).toBeChecked()
  expect(security).toBeDisabled()
  expect(screen.getByText('notificationPreferences.alwaysOn')).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: name('NEWSLETTER', 'email') })).toBeDisabled()
  expect(screen.getByText('notificationPreferences.needsConsent')).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: name('EVENTS_NEARBY', 'push') })).toBeEnabled()
})

it('saves one channel change and renders what the server stored', async () => {
  vi.mocked(notificationsService.getPreferences).mockResolvedValue(preferences(true))
  const stored = preferences(true)
  stored.categories[1] = { ...stored.categories[1]!, push: false }
  vi.mocked(notificationsService.setChannel).mockResolvedValue(stored)
  setup()

  fireEvent.click(await screen.findByRole('checkbox', { name: name('EVENTS_NEARBY', 'push') }))

  await waitFor(() => expect(screen.getByRole('checkbox', { name: name('EVENTS_NEARBY', 'push') })).not.toBeChecked())
  expect(notificationsService.setChannel).toHaveBeenCalledWith('EVENTS_NEARBY', 'push', false)
  expect(addToast).toHaveBeenCalledWith({ type: 'success', message: 'notificationPreferences.saved' })
})

it('granting consent unlocks the promotional categories', async () => {
  vi.mocked(notificationsService.getPreferences).mockResolvedValue(preferences(false))
  vi.mocked(notificationsService.setMarketingConsent).mockResolvedValue(preferences(true))
  setup()

  fireEvent.click(await screen.findByRole('switch'))

  await waitFor(() => expect(screen.getByRole('checkbox', { name: name('NEWSLETTER', 'email') })).toBeEnabled())
  expect(notificationsService.setMarketingConsent).toHaveBeenCalledWith(true)
  expect(screen.getByRole('switch')).toBeChecked()
})

it('reports a failed save and keeps the previous choice', async () => {
  vi.mocked(notificationsService.getPreferences).mockResolvedValue(preferences(true))
  vi.mocked(notificationsService.setChannel).mockRejectedValue(new Error('503'))
  setup()

  fireEvent.click(await screen.findByRole('checkbox', { name: name('EVENTS_NEARBY', 'email') }))

  await waitFor(() => expect(addToast).toHaveBeenCalledWith({ type: 'error', message: 'notificationPreferences.saveError' }))
  expect(screen.getByRole('checkbox', { name: name('EVENTS_NEARBY', 'email') })).toBeChecked()
})

it('offers the events-near-you area picker with that category', async () => {
  vi.mocked(notificationsService.getPreferences).mockResolvedValue(preferences(true))
  setup()

  expect(await screen.findByText('notificationPreferences.eventArea.title')).toBeInTheDocument()
  expect(await screen.findByRole('combobox', { name: 'notificationPreferences.eventArea.region' })).toBeInTheDocument()
})

it('offers no email switch for a push-only category', async () => {
  vi.mocked(notificationsService.getPreferences).mockResolvedValue(preferences(true))
  setup()

  expect(await screen.findByRole('checkbox', { name: name('RECOMMENDATIONS', 'push') })).toBeEnabled()
  expect(screen.queryByRole('checkbox', { name: name('RECOMMENDATIONS', 'email') })).toBeNull()
  expect(screen.getByRole('checkbox', { name: name('EVENTS_NEARBY', 'email') })).toBeInTheDocument()
})

it('shows reminders as an optional push category, on by default', async () => {
  vi.mocked(notificationsService.getPreferences).mockResolvedValue(preferences(false))
  setup()

  const reminders = await screen.findByRole('checkbox', { name: name('REMINDERS', 'push') })
  expect(reminders).toBeChecked()
  expect(reminders).toBeEnabled()
  expect(screen.getByText('notificationPreferences.categories.REMINDERS.description')).toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: name('REMINDERS', 'email') })).toBeNull()
})
