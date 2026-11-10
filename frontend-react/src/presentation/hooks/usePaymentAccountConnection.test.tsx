import { PaymentConnectionError } from '@/application/ports/PaymentAccount'
import { StrictMode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePaymentAccountConnection } from './usePaymentAccountConnection'
import { paymentAccountService } from '@/application/services/paymentAccount.instance'
const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  isInitializing: false,
  user: { id: 'owner' },
  hasAnyRole: vi.fn(() => true),
}))
vi.mock('./useAuth', () => ({ useAuth: () => auth }))
vi.mock('react-i18next', () => {
  const t = (key: string, options?: { rate?: string }) =>
    options?.rate ? `${key}:${options.rate}` : key
  return { useTranslation: () => ({ t }) }
})
vi.mock('@/application/services/paymentAccount.instance', () => ({
  paymentAccountService: {
    readCallback: vi.fn(),
    callbackFailed: vi.fn(),
    returnToApp: vi.fn(),
    clearCallback: vi.fn(),
    status: vi.fn(),
    connect: vi.fn(),
    complete: vi.fn(),
  },
}))
const service = vi.mocked(paymentAccountService)
beforeEach(() => {
  vi.resetAllMocks()
  auth.isAuthenticated = true
  auth.user = { id: 'owner' }
  auth.hasAnyRole.mockReturnValue(true)
  service.readCallback.mockReturnValue(null)
  service.callbackFailed.mockReturnValue(false)
  service.status.mockResolvedValue({ connected: false, environment: 'SANDBOX', commissionPercent: null })
  service.complete.mockResolvedValue({ returnToApp: false })
})
describe('payment connection callback', () => {
  it('automatically completes once without a browser login, including StrictMode', async () => {
    auth.isAuthenticated = false
    service.readCallback.mockReturnValue({ state: 'state', code: 'code' })
    service.complete.mockResolvedValue({ returnToApp: true })
    const { result } = renderHook(usePaymentAccountConnection, {
      wrapper: StrictMode,
    })
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(service.complete).toHaveBeenCalledExactlyOnceWith({
      state: 'state',
      code: 'code',
    })
    expect(service.status).not.toHaveBeenCalled()
    expect(service.returnToApp).toHaveBeenCalledOnce()
    expect(result.current.message).toBe('payments.connected')
    expect(result.current.returnToApp).toBe(true)
    act(() => result.current.openApp())
    expect(service.returnToApp).toHaveBeenCalledTimes(2)
  })
  it.each([
    'accountHasOperations',
    'platformAccount',
    'pilotRestricted',
    'expired',
    'unavailable',
  ] as const)(
    'explains %s without hiding it behind a generic error',
    async (reason) => {
      service.readCallback.mockReturnValue({ state: 'state', code: 'code' })
      service.complete.mockRejectedValue(new PaymentConnectionError(reason))
      const { result } = renderHook(usePaymentAccountConnection)
      await waitFor(() =>
        expect(result.current.message).toBe(
          `payments.connectionErrors.${reason}`,
        ),
      )
    },
  )
  it('renders safe failure and never replays a consumed code', async () => {
    service.readCallback.mockReturnValue({ state: 'state', code: 'code' })
    service.complete.mockRejectedValue(new Error('secret'))
    const { result, rerender } = renderHook(usePaymentAccountConnection)
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.message).toBe('payments.retryConnection')
    rerender()
    expect(service.complete).toHaveBeenCalledOnce()
  })
  it('shows explicit provider cancellation without calling completion', async () => {
    service.callbackFailed.mockReturnValue(true)
    const { result } = renderHook(usePaymentAccountConnection)
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.callbackPage).toBe(true)
    expect(service.complete).not.toHaveBeenCalled()
  })
  it('does not call protected APIs for visitors', async () => {
    auth.isAuthenticated = false
    const { result } = renderHook(usePaymentAccountConnection)
    await act(() => result.current.connect())
    expect(service.connect).not.toHaveBeenCalled()
    expect(service.status).not.toHaveBeenCalled()
  })
  it('loads the account, fences double clicks and sanitizes provider errors', async () => {
    service.status.mockResolvedValue({
      connected: true,
      environment: 'LIVE_PILOT',
      commissionPercent: 3,
    })
    const { result } = renderHook(usePaymentAccountConnection)
    await waitFor(() => expect(result.current.connected).toBe(true))
    let reject!: (error: Error) => void
    service.connect.mockReturnValue(
      new Promise((_, fail) => {
        reject = fail
      }),
    )
    let pending!: Promise<void>
    act(() => {
      pending = result.current.connect()
    })
    await act(() => result.current.connect())
    expect(service.connect).toHaveBeenCalledOnce()
    await act(async () => {
      reject(new Error('secret'))
      await pending
    })
    expect(result.current.message).toBe('payments.unavailable')
  })
  it('keeps success visible if the browser cannot open the app', async () => {
    service.readCallback.mockReturnValue({ state: 'state', code: 'code' })
    service.complete.mockResolvedValue({ returnToApp: true })
    service.returnToApp.mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(usePaymentAccountConnection)
    await waitFor(() => expect(result.current.status).toBe('success'))
  })
  it('formats the commission the API reports and offers none when it is missing', async () => {
    service.status.mockResolvedValue({ connected: true, environment: 'LIVE', commissionPercent: 8 })
    const { result, unmount } = renderHook(usePaymentAccountConnection)
    await waitFor(() => expect(result.current.commissionRate).toBe('8'))
    unmount()
    service.status.mockResolvedValue({ connected: true, environment: 'LIVE', commissionPercent: 2.5 })
    const fractional = renderHook(usePaymentAccountConnection)
    await waitFor(() => expect(fractional.result.current.connected).toBe(true))
    expect(['2,5', '2.5']).toContain(fractional.result.current.commissionRate)
    fractional.unmount()
    service.status.mockResolvedValue({ connected: true, environment: 'LIVE', commissionPercent: null })
    const missing = renderHook(usePaymentAccountConnection)
    await waitFor(() => expect(missing.result.current.connected).toBe(true))
    expect(missing.result.current.commissionRate).toBeNull()
  })
  it('does not show another owner the previous commission', async () => {
    service.status.mockResolvedValue({ connected: true, environment: 'LIVE', commissionPercent: 3 })
    const { result, rerender } = renderHook(usePaymentAccountConnection)
    await waitFor(() => expect(result.current.commissionRate).toBe('3'))
    service.status.mockReturnValue(new Promise(() => undefined))
    auth.user = { id: 'other' }
    rerender()
    expect(result.current.commissionRate).toBeNull()
  })
  it('reports connection status failure', async () => {
    service.status.mockRejectedValue(new Error('secret'))
    const { result } = renderHook(usePaymentAccountConnection)
    await waitFor(() =>
      expect(result.current.message).toBe('payments.unavailable'),
    )
  })
})
