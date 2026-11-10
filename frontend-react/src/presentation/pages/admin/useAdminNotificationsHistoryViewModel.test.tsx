import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnnouncementRecord } from '@domain/admin/announcement'
import { useAdminNotificationsHistoryViewModel } from './useAdminNotificationsHistoryViewModel'

const mocks = vi.hoisted(() => ({ detail: vi.fn(), refetch: vi.fn() }))
vi.mock('@hooks/queries/admin/useAdminNotifications', () => ({
  useAnnouncementHistory: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useAnnouncementDetail: (id: string | null) => mocks.detail(id),
}))

const listed: AnnouncementRecord = {
  id: 'a1', kind: 'NEWS', test: false,
  audience: { email: true, push: true, language: null, countryId: null, regionId: null, role: null },
  destination: 'HOME', title: 'Vendimia', recipients: 12, sentBy: 'admin@vinnot.test',
  createdAt: '2026-10-20T12:00:00Z', completedAt: null,
  stats: { emailsSent: 1, emailsFailed: 0, pushesSent: 1, pushesFailed: 0, pushesOpened: 0 },
}

function detailState(overrides: Record<string, unknown> = {}) {
  return { data: undefined, isLoading: false, isFetching: false, isError: false, refetch: mocks.refetch, ...overrides }
}

describe('announcement history and results', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.detail.mockReturnValue(detailState())
  })

  it('reads no announcement until one is opened, then shows the listed one while its latest results load', () => {
    const { result } = renderHook(useAdminNotificationsHistoryViewModel)
    expect(mocks.detail).toHaveBeenLastCalledWith(null)
    expect(result.current.selected).toBeNull()

    mocks.detail.mockReturnValue(detailState({ isLoading: true, isFetching: true }))
    act(() => result.current.open(listed))

    expect(mocks.detail).toHaveBeenLastCalledWith('a1')
    expect(result.current.selected).toBe(listed)
    expect(result.current.detail).toEqual({ loading: true, failed: false, notFound: false })

    act(() => result.current.close())
    expect(result.current.selected).toBeNull()
  })

  it('shows the latest results once they arrive', () => {
    const latest = { ...listed, completedAt: '2026-10-20T12:05:00Z', stats: { ...listed.stats, pushesOpened: 4 } }
    mocks.detail.mockReturnValue(detailState({ data: latest }))
    const { result } = renderHook(useAdminNotificationsHistoryViewModel)

    act(() => result.current.open(listed))

    expect(result.current.selected).toBe(latest)
  })

  it('says when the announcement no longer exists and lets a failed read be retried', () => {
    mocks.detail.mockReturnValue(detailState({ data: null }))
    const { result, rerender } = renderHook(useAdminNotificationsHistoryViewModel)
    act(() => result.current.open(listed))
    expect(result.current.detail.notFound).toBe(true)
    expect(result.current.selected).toBe(listed)

    mocks.detail.mockReturnValue(detailState({ isError: true }))
    rerender()
    expect(result.current.detail).toEqual({ loading: false, failed: true, notFound: false })
    result.current.retryDetail()
    expect(mocks.refetch).toHaveBeenCalled()
  })
})
