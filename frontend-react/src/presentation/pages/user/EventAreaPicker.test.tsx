import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { EventAreaPicker } from './EventAreaPicker'
import { notificationsService } from '@services/notifications.service'
import { regionsService } from '@services/regions.service'

const addToast = vi.fn()
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }) }))
vi.mock('@services/notifications.service', () => ({
  notificationsService: { getEventArea: vi.fn(), setEventAreaRegion: vi.fn(), clearEventArea: vi.fn() },
}))
vi.mock('@services/regions.service', () => ({ regionsService: { getRegions: vi.fn() } }))

const regions = [
  { id: 'r-1', name: 'Valle de Uco', countryId: 'c-1', countryCode: 'AR', countryName: 'Argentina' },
  { id: 'r-2', name: 'Rioja', countryId: 'c-2', countryCode: 'ES', countryName: 'España' },
]

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><EventAreaPicker /></QueryClientProvider>)
}

const picker = () => screen.findByRole('combobox', { name: 'notificationPreferences.eventArea.region' })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(regionsService.getRegions).mockResolvedValue(regions)
})

it('offers the catalogue regions and no stop action while there is no area', async () => {
  vi.mocked(notificationsService.getEventArea).mockResolvedValue(null)
  setup()

  const select = await picker()
  await waitFor(() => expect(screen.getByRole('option', { name: 'Valle de Uco, Argentina' })).toBeInTheDocument())
  expect(select).toHaveValue('')
  expect(screen.getByRole('option', { name: 'Rioja, España' })).toBeInTheDocument()
  expect(screen.getByText('notificationPreferences.eventArea.helper')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'notificationPreferences.eventArea.clear' })).not.toBeInTheDocument()
})

it('picks a region in one tap and shows what the server stored', async () => {
  vi.mocked(notificationsService.getEventArea)
    .mockResolvedValueOnce(null)
    .mockResolvedValue({ kind: 'REGION', regionId: 'r-2', regionName: 'Rioja' })
  vi.mocked(notificationsService.setEventAreaRegion).mockResolvedValue(undefined)
  setup()
  await screen.findByRole('option', { name: 'Rioja, España' })

  fireEvent.change(await picker(), { target: { value: 'r-2' } })

  await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('r-2'))
  expect(notificationsService.setEventAreaRegion).toHaveBeenCalledWith('r-2')
  expect(addToast).toHaveBeenCalledWith({ type: 'success', message: 'notificationPreferences.eventArea.saved' })
  expect(screen.getByRole('button', { name: 'notificationPreferences.eventArea.clear' })).toBeEnabled()
})

it('describes an approximate location set from the app and lets the user stop it', async () => {
  vi.mocked(notificationsService.getEventArea)
    .mockResolvedValueOnce({ kind: 'APPROXIMATE' })
    .mockResolvedValue(null)
  vi.mocked(notificationsService.clearEventArea).mockResolvedValue(undefined)
  setup()

  expect(await screen.findByText('notificationPreferences.eventArea.approximate')).toBeInTheDocument()
  expect(await picker()).toHaveValue('')

  fireEvent.click(screen.getByRole('button', { name: 'notificationPreferences.eventArea.clear' }))

  await waitFor(() => expect(screen.queryByText('notificationPreferences.eventArea.approximate')).not.toBeInTheDocument())
  expect(notificationsService.clearEventArea).toHaveBeenCalledOnce()
  expect(addToast).toHaveBeenCalledWith({ type: 'success', message: 'notificationPreferences.eventArea.cleared' })
  expect(screen.queryByRole('button', { name: 'notificationPreferences.eventArea.clear' })).not.toBeInTheDocument()
})

it('reports a failed change and keeps the stored area', async () => {
  vi.mocked(notificationsService.getEventArea).mockResolvedValue({ kind: 'REGION', regionId: 'r-1', regionName: 'Valle de Uco' })
  vi.mocked(notificationsService.setEventAreaRegion).mockRejectedValue(new Error('404'))
  setup()
  await screen.findByRole('option', { name: 'Rioja, España' })
  await waitFor(async () => expect(await picker()).toHaveValue('r-1'))

  fireEvent.change(await picker(), { target: { value: 'r-2' } })

  await waitFor(() => expect(addToast).toHaveBeenCalledWith({ type: 'error', message: 'notificationPreferences.eventArea.saveError' }))
  await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('r-1'))
})

it('shows a retry when the area cannot be loaded', async () => {
  vi.mocked(notificationsService.getEventArea)
    .mockRejectedValueOnce(new Error('503'))
    .mockResolvedValue(null)
  setup()

  fireEvent.click(await screen.findByRole('button', { name: 'common.retry' }))

  expect(await picker()).toBeInTheDocument()
  expect(notificationsService.getEventArea).toHaveBeenCalledTimes(2)
})
