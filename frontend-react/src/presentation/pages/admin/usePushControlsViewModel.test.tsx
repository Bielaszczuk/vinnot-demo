import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PushTypeSetting } from '@domain/admin/pushAdministration'
import { usePushControlsViewModel } from './usePushControlsViewModel'

const mocks = vi.hoisted(() => ({ toast: vi.fn(), change: vi.fn(), metrics: vi.fn(), engagement: vi.fn() }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }),
}))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/queries/admin', () => ({
  usePushSettings: () => ({ data: { provider: 'log', types: [], recentChanges: [] } }),
  usePushMetrics: (days: number) => { mocks.metrics(days); return { data: undefined } },
  usePushEngagement: (days: number) => { mocks.engagement(days); return { data: undefined } },
  useSetPushTypeEnabled: () => ({ mutateAsync: mocks.change, isPending: false }),
}))

const reminder: PushTypeSetting = { type: 'EVENT_REMINDER', category: 'TICKETS', transactional: true, enabled: true }
const nearby: PushTypeSetting = { type: 'EVENT_NEARBY', category: 'EVENTS_NEARBY', transactional: false, enabled: true }

describe('push controls', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads seven days by default and knows the server sends nothing with the log provider', () => {
    const { result } = renderHook(usePushControlsViewModel)
    expect(mocks.metrics).toHaveBeenLastCalledWith(7)
    expect(result.current.sending).toBe(false)
    act(() => result.current.setDays(30))
    expect(mocks.metrics).toHaveBeenLastCalledWith(30)
  })

  it('reads the engagement results for their own window, seven days by default', () => {
    const { result } = renderHook(usePushControlsViewModel)
    expect(mocks.engagement).toHaveBeenLastCalledWith(7)
    act(() => result.current.setEngagementDays(1))
    expect(mocks.engagement).toHaveBeenLastCalledWith(1)
    expect(result.current.engagementDays).toBe(1)
    expect(mocks.metrics).toHaveBeenLastCalledWith(7)
  })

  it('switches an optional type at once', async () => {
    mocks.change.mockResolvedValue({})
    const { result } = renderHook(usePushControlsViewModel)

    await act(async () => result.current.toggle(nearby))

    expect(mocks.change).toHaveBeenCalledWith({ type: 'EVENT_NEARBY', enabled: false })
    expect(result.current.pendingOff).toBeNull()
  })

  it('asks before turning a transactional type off', async () => {
    mocks.change.mockResolvedValue({})
    const { result } = renderHook(usePushControlsViewModel)

    act(() => result.current.toggle(reminder))
    expect(mocks.change).not.toHaveBeenCalled()
    expect(result.current.pendingOff).toEqual(reminder)

    await act(() => result.current.confirmOff())
    expect(mocks.change).toHaveBeenCalledWith({ type: 'EVENT_REMINDER', enabled: false })
    expect(result.current.pendingOff).toBeNull()
  })

  it('turns a transactional type back on without asking and reports failures', async () => {
    mocks.change.mockRejectedValue(new Error('down'))
    const { result } = renderHook(usePushControlsViewModel)

    await act(async () => result.current.toggle({ ...reminder, enabled: false }))

    expect(mocks.change).toHaveBeenCalledWith({ type: 'EVENT_REMINDER', enabled: true })
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'admin.notifications.errors.generic' })
  })
})
