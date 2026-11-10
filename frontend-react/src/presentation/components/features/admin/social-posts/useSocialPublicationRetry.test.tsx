import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSocialPublicationRetry } from './useSocialPublicationRetry'

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  retry: vi.fn(),
  mutation: { isPending: false, variables: undefined as { id: string; network: string } | undefined },
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US', resolvedLanguage: undefined } }),
}))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@services/adminSocialPosts.service', () => ({
  isSocialPostConflict: (error: unknown) => (error as { status?: number }).status === 409,
  isPublishingOff: (error: unknown) => (error as { code?: string }).code === 'SOCIAL_PUBLISHING_OFF',
}))
vi.mock('@hooks/queries/admin/useAdminSocialPosts', () => ({
  useRetrySocialPublication: () => ({ mutateAsync: mocks.retry, ...mocks.mutation }),
}))

describe('social publication retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mutation = { isPending: false, variables: undefined }
  })

  it('queues the network of the selected post again and confirms it', async () => {
    mocks.retry.mockResolvedValue(undefined)
    const { result } = renderHook(() => useSocialPublicationRetry('p1'))

    await act(async () => { await result.current.retry('THREADS') })

    expect(mocks.retry).toHaveBeenCalledWith({ id: 'p1', network: 'THREADS' })
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'admin.socialPosts.publications.retried' })
  })

  it('explains a publication that is no longer failed, and any other failure', async () => {
    mocks.retry.mockRejectedValueOnce({ status: 409 }).mockRejectedValueOnce({ status: 500 })
    const { result } = renderHook(() => useSocialPublicationRetry('p1'))

    await act(async () => { await result.current.retry('THREADS') })
    await act(async () => { await result.current.retry('THREADS') })

    expect(mocks.toast).toHaveBeenNthCalledWith(1, { type: 'error', message: 'admin.socialPosts.publications.retryConflict' })
    expect(mocks.toast).toHaveBeenNthCalledWith(2, { type: 'error', message: 'admin.socialPosts.actions.error' })
  })

  it('explains a retry refused because publishing or the network is off', async () => {
    mocks.retry.mockRejectedValueOnce({ status: 409, code: 'SOCIAL_PUBLISHING_OFF' })
    const { result } = renderHook(() => useSocialPublicationRetry('p1'))

    await act(async () => { await result.current.retry('THREADS') })

    expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'admin.socialPosts.publications.retryOff' })
  })

  it('does nothing without a selected post', async () => {
    const { result } = renderHook(() => useSocialPublicationRetry(undefined))
    await act(async () => { await result.current.retry('THREADS') })
    expect(mocks.retry).not.toHaveBeenCalled()
  })

  it('names the network being retried and formats figures in the UI language', () => {
    mocks.mutation = { isPending: true, variables: { id: 'p1', network: 'FACEBOOK' } }
    const { result, rerender } = renderHook(() => useSocialPublicationRetry('p1'))
    expect(result.current.retryingNetwork).toBe('FACEBOOK')
    expect(result.current.formatNumber(12345)).toBe(new Intl.NumberFormat('en-US').format(12345))

    mocks.mutation = { isPending: false, variables: { id: 'p1', network: 'FACEBOOK' } }
    rerender()
    expect(result.current.retryingNetwork).toBeNull()
  })
})
