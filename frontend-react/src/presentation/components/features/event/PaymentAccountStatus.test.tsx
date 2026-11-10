import { render, screen, waitFor } from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { PaymentAccountStatus } from './PaymentAccountStatus'
import { paymentAccountService } from '@/application/services/paymentAccount.instance'
const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  user: { id: 'owner' },
  hasAnyRole: () => true,
}))
vi.mock('@/presentation/hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { rate?: string }) =>
      options?.rate ? `${key}:${options.rate}` : key,
  }),
}))
vi.mock('@/application/services/paymentAccount.instance', () => ({
  paymentAccountService: { status: vi.fn() },
}))
beforeEach(() => {
  vi.resetAllMocks()
  auth.user = { id: 'owner' }
  auth.isAuthenticated = true
})
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={client}>
      <PaymentAccountStatus />
    </QueryClientProvider>,
  )
  return { ...view, client }
}
it('shows checking then a persistent connected state with a distinct secondary action', async () => {
  vi.mocked(paymentAccountService.status).mockResolvedValue({
    connected: true,
    environment: 'LIVE',
    commissionPercent: null,
  })
  setup()
  expect(screen.getByText('eventEditor.checkingPayments')).toBeInTheDocument()
  expect(
    await screen.findByText('eventEditor.paymentsConnected'),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'eventEditor.reconnectPayments' }),
  ).toHaveAttribute('href', '/partner/payments')
  expect(
    screen.queryByText('eventEditor.connectPayments'),
  ).not.toBeInTheDocument()
})
it('does not present a network failure as a disconnected account or expose raw errors', async () => {
  vi.mocked(paymentAccountService.status).mockRejectedValue(
    new Error('raw 403'),
  )
  setup()
  expect(
    await screen.findByText('eventEditor.paymentsStatusError'),
  ).toBeInTheDocument()
  expect(screen.queryByText('raw 403')).not.toBeInTheDocument()
})
it('separates owner caches and fetches fresh state when focus resumes', async () => {
  vi.mocked(paymentAccountService.status).mockResolvedValue({
    connected: true,
    environment: 'LIVE',
    commissionPercent: null,
  })
  const { rerender, client } = setup()
  await screen.findByText('eventEditor.paymentsConnected')
  auth.user = { id: 'different-owner' }
  vi.mocked(paymentAccountService.status).mockResolvedValue({
    connected: false,
    environment: 'LIVE',
    commissionPercent: null,
  })
  rerender(
    <QueryClientProvider client={client}>
      <PaymentAccountStatus />
    </QueryClientProvider>,
  )
  expect(
    screen.queryByText('eventEditor.paymentsConnected'),
  ).not.toBeInTheDocument()
  await waitFor(() =>
    expect(
      screen.getByText('eventEditor.connectPaymentsWeb'),
    ).toBeInTheDocument(),
  )
  focusManager.setFocused(false)
  focusManager.setFocused(true)
  await waitFor(() =>
    expect(paymentAccountService.status).toHaveBeenCalledTimes(3),
  )
  focusManager.setFocused(undefined)
})
it('shows the commission the API reports and no rate when it is unknown', async () => {
  vi.mocked(paymentAccountService.status).mockResolvedValue({
    connected: false,
    environment: 'LIVE',
    commissionPercent: 12,
  })
  setup()
  expect(
    await screen.findByText('eventEditor.commissionRate:12'),
  ).toBeInTheDocument()
})
it('omits the commission sentence while the rate is unknown', async () => {
  vi.mocked(paymentAccountService.status).mockResolvedValue({
    connected: false,
    environment: 'LIVE',
    commissionPercent: null,
  })
  setup()
  await screen.findByText('eventEditor.connectPaymentsWeb')
  expect(screen.queryByText(/eventEditor.commissionRate/)).not.toBeInTheDocument()
})
