import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentPillarSettings } from '@domain/admin/socialPost'
import { useContentPillarsPanel } from './useContentPillarsPanel'

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  query: vi.fn(),
  setActive: vi.fn(),
  setAutoApprove: vi.fn(),
  active: { isPending: false, variables: undefined as { code: string; enabled: boolean } | undefined },
  autoApprove: { isPending: false, variables: undefined as { code: string; enabled: boolean } | undefined },
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR', resolvedLanguage: 'es-AR' } }),
}))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@services/adminSocialPosts.service', () => ({
  isLastRotatingPillar: (error: unknown) => (error as { code?: string }).code === 'LAST_ROTATING_PILLAR',
}))
vi.mock('@hooks/queries/admin/useAdminSocialPosts', () => ({
  useAdminContentPillars: () => mocks.query(),
  useSetPillarActive: () => ({ mutateAsync: mocks.setActive, ...mocks.active }),
  useSetPillarAutoApprove: () => ({ mutateAsync: mocks.setAutoApprove, ...mocks.autoApprove }),
}))

const terroir: ContentPillarSettings = {
  code: 'TERROIR', nameEs: 'Terruño', nameEn: 'Terroir', weight: 3, active: true, autoApprove: false,
  performance: { measuredPosts: 4, views: 5000, interactions: 300, factor: 1.25 },
}

describe('content pillars panel view model', () => {
  const refetch = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.active = { isPending: false, variables: undefined }
    mocks.autoApprove = { isPending: false, variables: undefined }
    mocks.query.mockReturnValue({ data: [terroir], isLoading: false, isError: false, refetch })
  })

  it('exposes the pillars and their loading state, and formats figures in the UI language', () => {
    const { result } = renderHook(() => useContentPillarsPanel())
    expect(result.current.pillars).toEqual([terroir])
    expect(result.current.loading).toBe(false)
    expect(result.current.failed).toBe(false)
    expect(result.current.switching).toBeNull()
    expect(result.current.formatNumber(12345)).toBe(new Intl.NumberFormat('es-AR').format(12345))
    result.current.refetch()
    expect(refetch).toHaveBeenCalledTimes(1)

    mocks.query.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch })
    const { result: loading } = renderHook(() => useContentPillarsPanel())
    expect(loading.current.pillars).toEqual([])
    expect(loading.current.loading).toBe(true)
  })

  it('flips the switch it was asked for and confirms it', async () => {
    mocks.setActive.mockResolvedValue({ ...terroir, active: false })
    mocks.setAutoApprove.mockResolvedValue({ ...terroir, autoApprove: true })
    const { result } = renderHook(() => useContentPillarsPanel())

    await act(async () => { await result.current.toggleActive(terroir) })
    await act(async () => { await result.current.toggleAutoApprove(terroir) })

    expect(mocks.setActive).toHaveBeenCalledWith({ code: 'TERROIR', enabled: false })
    expect(mocks.setAutoApprove).toHaveBeenCalledWith({ code: 'TERROIR', enabled: true })
    expect(mocks.toast).toHaveBeenCalledTimes(2)
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'admin.socialPosts.pillars.saved' })
  })

  it('explains why the last rotating pillar cannot be switched off, and any other failure', async () => {
    mocks.setActive.mockRejectedValue({ status: 409, code: 'LAST_ROTATING_PILLAR' })
    mocks.setAutoApprove.mockRejectedValue({ status: 500, code: 'INTERNAL_ERROR' })
    const { result } = renderHook(() => useContentPillarsPanel())

    await act(async () => { await result.current.toggleActive(terroir) })
    await act(async () => { await result.current.toggleAutoApprove(terroir) })

    expect(mocks.toast).toHaveBeenNthCalledWith(1, { type: 'error', message: 'admin.socialPosts.pillars.lastRotating' })
    expect(mocks.toast).toHaveBeenNthCalledWith(2, { type: 'error', message: 'admin.socialPosts.pillars.error' })
  })

  it('names the pillar whose switch is saving', () => {
    mocks.active = { isPending: true, variables: { code: 'TERROIR', enabled: false } }
    const { result, rerender } = renderHook(() => useContentPillarsPanel())
    expect(result.current.switching).toBe('TERROIR')

    mocks.active = { isPending: false, variables: undefined }
    mocks.autoApprove = { isPending: true, variables: { code: 'QUIZ', enabled: true } }
    rerender()
    expect(result.current.switching).toBe('QUIZ')
  })
})
