import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SocialPost } from '@domain/admin/socialPost'
import { useSocialPostSchedule } from './useSocialPostSchedule'

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  reschedule: vi.fn(),
  publishNow: vi.fn(),
  pending: { reschedule: false, publishNow: false },
  uiLanguage: 'es-AR',
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: mocks.uiLanguage, resolvedLanguage: undefined } }),
}))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@services/adminSocialPosts.service', () => ({
  scheduleActionError: (error: unknown) => (error as { kind?: string }).kind ?? 'OTHER',
}))
vi.mock('@hooks/queries/admin/useAdminSocialPosts', () => ({
  useRescheduleSocialPost: () => ({ mutateAsync: mocks.reschedule, isPending: mocks.pending.reschedule }),
  usePublishSocialPostNow: () => ({ mutateAsync: mocks.publishNow, isPending: mocks.pending.publishNow }),
}))

const post = {
  id: 'p1', status: 'APPROVED', scheduledFor: '2026-11-10T15:30:00Z', canReschedule: true, canPublishNow: true, networkSchedule: [],
} as unknown as SocialPost

describe('social post schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pending = { reschedule: false, publishNow: false }
    mocks.uiLanguage = 'es-AR'
    mocks.reschedule.mockResolvedValue(post)
    mocks.publishNow.mockResolvedValue(post)
  })

  it('opens the date and time of the post in Argentina time and saves the new ones', async () => {
    const { result } = renderHook(() => useSocialPostSchedule(post))
    expect(result.current.rescheduling).toBe(false)

    act(() => result.current.startReschedule())
    expect(result.current.rescheduling).toBe(true)
    expect([result.current.date, result.current.time]).toEqual(['2026-11-10', '12:30'])

    act(() => result.current.setDate('2026-11-12'))
    act(() => result.current.setTime('09:30'))
    await act(async () => { await result.current.saveSchedule() })

    expect(mocks.reschedule).toHaveBeenCalledWith({ id: 'p1', date: '2026-11-12', time: '09:30' })
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'admin.socialPosts.schedule.saved' })
    expect(result.current.rescheduling).toBe(false)
  })

  it('does not save an incomplete date and time', async () => {
    const { result } = renderHook(() => useSocialPostSchedule(post))
    act(() => result.current.startReschedule())
    act(() => result.current.setTime(''))
    expect(result.current.canSave).toBe(false)

    await act(async () => { await result.current.saveSchedule() })
    expect(mocks.reschedule).not.toHaveBeenCalled()
  })

  it.each([
    ['NOT_FUTURE', 'admin.socialPosts.schedule.errors.NOT_FUTURE'],
    ['DATE_TAKEN', 'admin.socialPosts.schedule.errors.DATE_TAKEN'],
    ['CONFLICT', 'admin.socialPosts.actions.conflict'],
    ['OTHER', 'admin.socialPosts.actions.error'],
  ])('explains a reschedule refused as %s and keeps the form open', async (kind, message) => {
    mocks.reschedule.mockRejectedValue({ kind })
    const { result } = renderHook(() => useSocialPostSchedule(post))
    act(() => result.current.startReschedule())

    await act(async () => { await result.current.saveSchedule() })

    expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message })
    expect(result.current.rescheduling).toBe(true)
  })

  it('asks for confirmation before publishing now', async () => {
    const { result } = renderHook(() => useSocialPostSchedule(post))

    act(() => result.current.startPublishNow())
    expect(result.current.confirmingPublishNow).toBe(true)
    expect(mocks.publishNow).not.toHaveBeenCalled()

    act(() => result.current.cancelPublishNow())
    expect(result.current.confirmingPublishNow).toBe(false)
    expect(mocks.publishNow).not.toHaveBeenCalled()

    act(() => result.current.startPublishNow())
    await act(async () => { await result.current.confirmPublishNow() })
    expect(mocks.publishNow).toHaveBeenCalledWith('p1')
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'admin.socialPosts.schedule.publishing' })
    expect(result.current.confirmingPublishNow).toBe(false)
  })

  it.each([
    ['MEDIA_NOT_READY', 'admin.socialPosts.schedule.errors.MEDIA_NOT_READY'],
    ['PUBLISHING_OFF', 'admin.socialPosts.schedule.errors.PUBLISHING_OFF'],
    ['CONFLICT', 'admin.socialPosts.actions.conflict'],
    ['OTHER', 'admin.socialPosts.actions.error'],
  ])('explains a publish-now refused as %s', async (kind, message) => {
    mocks.publishNow.mockRejectedValue({ kind })
    const { result } = renderHook(() => useSocialPostSchedule(post))
    act(() => result.current.startPublishNow())

    await act(async () => { await result.current.confirmPublishNow() })

    expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message })
  })

  it('closes the form and the confirmation when another post is selected', () => {
    const { result, rerender } = renderHook(({ current }) => useSocialPostSchedule(current), { initialProps: { current: post } })
    act(() => result.current.startReschedule())
    act(() => result.current.startPublishNow())

    rerender({ current: { ...post, id: 'p2' } })
    expect(result.current.rescheduling).toBe(false)
    expect(result.current.confirmingPublishNow).toBe(false)
  })

  it('does nothing without a selected post and reports work in progress', async () => {
    const { result, rerender } = renderHook(() => useSocialPostSchedule(undefined))
    act(() => result.current.startReschedule())
    await act(async () => { await result.current.saveSchedule() })
    await act(async () => { await result.current.confirmPublishNow() })
    expect(mocks.reschedule).not.toHaveBeenCalled()
    expect(mocks.publishNow).not.toHaveBeenCalled()
    expect(result.current.busy).toBe(false)

    mocks.pending = { reschedule: false, publishNow: true }
    rerender()
    expect(result.current.busy).toBe(true)
  })

  it('formats a network time as the 24-hour Argentina clock in every UI language', () => {
    const { result, rerender } = renderHook(() => useSocialPostSchedule(post))
    expect(result.current.formatTime('2026-11-10T22:30:00Z')).toBe('19:30')

    mocks.uiLanguage = 'en-US'
    rerender()
    expect(result.current.formatTime('2026-11-10T22:30:00Z')).toBe('19:30')
  })
})
