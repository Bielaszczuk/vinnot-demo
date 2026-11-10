import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { UnsubscribePage } from './UnsubscribePage'
import { notificationsService } from '@services/notifications.service'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { category?: string }) => (options?.category ? `${key}:${options.category}` : key),
  }),
}))
vi.mock('@services/notifications.service', () => ({
  notificationsService: { unsubscribe: vi.fn() },
  isRejectedUnsubscribeLink: (error: unknown) => error instanceof Error && error.message === 'INVALID_UNSUBSCRIBE_LINK',
}))

function setup(url: string) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}><UnsubscribePage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

it('waits for a click before unsubscribing and names the category', async () => {
  vi.mocked(notificationsService.unsubscribe).mockResolvedValue('NEWSLETTER')
  setup('/unsubscribe?token=token-1')

  expect(notificationsService.unsubscribe).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'unsubscribe.confirm' }))

  expect(await screen.findByText('unsubscribe.success:notificationPreferences.categories.NEWSLETTER.name')).toBeInTheDocument()
  expect(notificationsService.unsubscribe).toHaveBeenCalledWith('token-1')
  expect(screen.queryByRole('button', { name: 'unsubscribe.confirm' })).not.toBeInTheDocument()
})

it('shows the invalid link state without a token', () => {
  setup('/unsubscribe')

  expect(screen.getByText('unsubscribe.invalid')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'unsubscribe.confirm' })).not.toBeInTheDocument()
})

it('shows the invalid link state when the server rejects the token', async () => {
  vi.mocked(notificationsService.unsubscribe).mockRejectedValue(new Error('INVALID_UNSUBSCRIBE_LINK'))
  setup('/unsubscribe?token=expired')

  fireEvent.click(screen.getByRole('button', { name: 'unsubscribe.confirm' }))

  expect(await screen.findByText('unsubscribe.invalid')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'unsubscribe.confirm' })).not.toBeInTheDocument()
})

it('keeps the confirm button for a retry when the request fails for another reason', async () => {
  vi.mocked(notificationsService.unsubscribe).mockRejectedValueOnce(new Error('NETWORK_ERROR')).mockResolvedValueOnce('NEWSLETTER')
  setup('/unsubscribe?token=token-1')

  fireEvent.click(screen.getByRole('button', { name: 'unsubscribe.confirm' }))
  expect(await screen.findByText('unsubscribe.failed')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'unsubscribe.confirm' }))

  expect(await screen.findByText('unsubscribe.success:notificationPreferences.categories.NEWSLETTER.name')).toBeInTheDocument()
  expect(notificationsService.unsubscribe).toHaveBeenCalledTimes(2)
})

it('links to the notifications tab of the profile', () => {
  setup('/unsubscribe?token=token-1')

  expect(screen.getByRole('link', { name: 'unsubscribe.managePreferences' })).toHaveAttribute('href', '/profile?tab=notifications')
})
