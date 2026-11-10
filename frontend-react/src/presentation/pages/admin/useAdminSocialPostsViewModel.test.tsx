import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEGAL_LINES, type SocialPost, type WineDay } from '@domain/admin/socialPost'
import { useAdminSocialPostsViewModel } from './useAdminSocialPostsViewModel'

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  update: vi.fn(),
  regenerate: vi.fn(),
  newIllustration: vi.fn(),
  plan: vi.fn(),
  list: vi.fn(),
  detail: vi.fn(),
  wineDays: vi.fn(),
  pending: { approve: false, reject: false, update: false, regenerate: false, illustration: false, plan: false },
  uiLanguage: 'es-AR',
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: mocks.uiLanguage, resolvedLanguage: undefined },
  }),
}))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@services/adminSocialPosts.service', () => ({
  isSocialPostConflict: (error: unknown) => (error as { status?: number }).status === 409,
}))
vi.mock('@hooks/queries/admin/useAdminSocialPosts', () => ({
  useAdminSocialPosts: (...args: unknown[]) => mocks.list(...args),
  useAdminSocialPost: (id?: string) => mocks.detail(id),
  useAdminWineDays: (year: number, enabled = true) => mocks.wineDays(year, enabled),
  useApproveSocialPost: () => ({ mutateAsync: mocks.approve, isPending: mocks.pending.approve }),
  useRejectSocialPost: () => ({ mutateAsync: mocks.reject, isPending: mocks.pending.reject }),
  useUpdateSocialPostCopy: () => ({ mutateAsync: mocks.update, isPending: mocks.pending.update }),
  useRegenerateSocialPost: () => ({ mutateAsync: mocks.regenerate, isPending: mocks.pending.regenerate }),
  useNewSocialPostIllustration: () => ({ mutateAsync: mocks.newIllustration, isPending: mocks.pending.illustration }),
  usePlanSocialPosts: () => ({ mutateAsync: mocks.plan, isPending: mocks.pending.plan }),
}))

const copy = {
  hook: 'Tres datos sobre el Malbec',
  slides: [{ title: 'Origen', body: 'Cahors.' }, { title: 'Llegada', body: '1853.' }, { title: 'Hoy', body: 'Mendoza.' }],
  caption: `Datos. ${LEGAL_LINES.es}`,
  hashtags: ['#vinnot', '#malbec', '#vino', '#mendoza', '#dato'],
  altText: 'Carrusel.',
  cta: '¿Cuál te sorprendió?',
  illustration: null,
}
const english = {
  ...copy,
  hook: 'Three facts about Malbec',
  caption: `Facts. ${LEGAL_LINES.en}`,
  hashtags: ['#vinnot', '#malbec', '#wine', '#mendoza', '#winefacts'],
  cta: 'Which one surprised you?',
}

const post: SocialPost = {
  id: 'p1', status: 'PENDING_APPROVAL', scheduledFor: '2026-11-03T22:00:00Z',
  pillar: { code: 'CURIOUS_FACT', nameEs: 'Dato curioso', nameEn: 'Curious fact', weight: 2 },
  wineDay: null, copies: { es: copy, en: english },
  generation: { provider: 'openai', model: 'gpt', mock: false, attempts: 1, generatedAt: '2026-11-02T12:00:00Z', factCheck: 'PASSED', issues: [], error: null },
  review: null, media: null, publishing: null, publications: [], canReschedule: false, canPublishNow: false, networkSchedule: [], createdAt: '2026-11-02T12:00:00Z', updatedAt: '2026-11-02T12:00:00Z',
}

function wineDay(code: string, date: string): WineDay {
  return { code, nameEs: code, nameEn: code, kind: 'GRAPE', priority: 1, countryCode: null, date }
}

const today = new Date(2026, 10, 15)

describe('social posts view model', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pending = { approve: false, reject: false, update: false, regenerate: false, illustration: false, plan: false }
    mocks.uiLanguage = 'es-AR'
    mocks.list.mockReturnValue({ data: { items: [post], totalItems: 21 }, isLoading: false, isError: false, refetch: vi.fn() })
    mocks.detail.mockImplementation((id?: string) => ({ data: id ? post : undefined, isLoading: false, isError: false, refetch: vi.fn() }))
    mocks.wineDays.mockReturnValue({ data: [wineDay('MERLOT', '2026-11-07'), wineDay('MALBEC', '2026-04-17'), wineDay('CAB_FRANC', '2026-12-04')], isLoading: false, isError: false, refetch: vi.fn() })
    mocks.approve.mockResolvedValue({ ...post, status: 'APPROVED' })
    mocks.reject.mockResolvedValue({ ...post, status: 'REJECTED' })
    mocks.update.mockResolvedValue(post)
    mocks.regenerate.mockResolvedValue(post)
    mocks.newIllustration.mockResolvedValue(post)
    mocks.plan.mockResolvedValue({ created: 5, from: '2026-11-16', to: '2026-11-29' })
  })

  it('starts on the pending queue, first page, and resets the page when the status changes', () => {
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    expect(result.current.status).toBe('PENDING_APPROVAL')
    expect(mocks.list).toHaveBeenCalledWith(0, 20, 'PENDING_APPROVAL', false)
    expect(result.current.posts).toEqual([post])
    expect(result.current.totalPages).toBe(2)

    act(() => result.current.setPage(1))
    act(() => result.current.setStatus('APPROVED'))
    expect(result.current.page).toBe(0)
    expect(mocks.list).toHaveBeenLastCalledWith(0, 20, 'APPROVED', false)
  })

  it('reads empty lists while loading and only asks for next year in December', () => {
    mocks.list.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() })
    mocks.wineDays.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() })
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    expect(result.current.posts).toEqual([])
    expect(result.current.totalPages).toBe(0)
    expect(result.current.wineDays).toEqual([])
    expect(result.current.wineDaysLoading).toBe(true)
    expect(mocks.wineDays).toHaveBeenCalledWith(2026, false)

    mocks.wineDays.mockImplementation((year: number) => ({
      data: year === 2026 ? [wineDay('DEC', '2026-12-16')] : [wineDay('JAN', '2027-01-27')], isLoading: false, isError: false, refetch: vi.fn(),
    }))
    const december = renderHook(() => useAdminSocialPostsViewModel(new Date(2026, 11, 2)))
    expect(mocks.wineDays).toHaveBeenCalledWith(2027, true)
    expect(december.result.current.wineDays.map((day) => day.code)).toEqual(['DEC', 'JAN'])
  })

  it('lists the wine days of this month and the next, sorted, and formats dates in the locale', () => {
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    expect(result.current.wineDays.map((day) => day.code)).toEqual(['MERLOT', 'CAB_FRANC'])
    expect(result.current.formatDate('2026-11-03T22:00:00Z')).toEqual(expect.any(String))
    expect(result.current.formatDay('2026-11-07')).toContain('7')
    act(() => result.current.refetchWineDays())
  })

  it('selects a post, exposes its allowed actions and approves it', async () => {
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    expect(result.current.post).toBeUndefined()
    expect(result.current.actions).toEqual([])

    act(() => result.current.selectPost('p1'))
    expect(result.current.post).toEqual(post)
    expect(result.current.actions).toEqual(['approve', 'reject', 'edit', 'regenerate'])

    await act(async () => { await result.current.approve() })
    expect(mocks.approve).toHaveBeenCalledWith('p1')
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'admin.socialPosts.actions.approved' })
  })

  it('does nothing without a selected post', async () => {
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    await act(async () => {
      await result.current.approve()
      await result.current.confirmReject()
      await result.current.regenerate()
      await result.current.newIllustration()
      await result.current.saveEdit()
    })
    expect(mocks.newIllustration).not.toHaveBeenCalled()
    expect(result.current.canRequestIllustration).toBe(false)
    expect(mocks.approve).not.toHaveBeenCalled()
    expect(mocks.reject).not.toHaveBeenCalled()
    expect(mocks.regenerate).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects with the typed reason and clears the form, keeping it open when the backend refuses', async () => {
    mocks.reject.mockRejectedValueOnce(Object.assign(new Error('Invalid transition'), { status: 409 }))
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    act(() => result.current.selectPost('p1'))
    act(() => result.current.startReject())
    act(() => result.current.setReason('Tono'))
    expect(result.current.rejecting).toBe(true)

    await act(async () => { await result.current.confirmReject() })
    expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: 'admin.socialPosts.actions.conflict' })
    expect(result.current.rejecting).toBe(true)

    await act(async () => { await result.current.confirmReject() })
    expect(mocks.reject).toHaveBeenLastCalledWith({ id: 'p1', reason: 'Tono' })
    expect(result.current.rejecting).toBe(false)
    expect(result.current.reason).toBe('')

    act(() => result.current.startReject())
    act(() => result.current.cancelReject())
    expect(result.current.rejecting).toBe(false)
  })

  it('reports other failures generically and regenerates', async () => {
    mocks.regenerate.mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    act(() => result.current.selectPost('p1'))

    await act(async () => { await result.current.regenerate() })
    expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: 'admin.socialPosts.actions.error' })

    await act(async () => { await result.current.regenerate() })
    expect(mocks.regenerate).toHaveBeenCalledTimes(2)
    expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'success', message: 'admin.socialPosts.actions.regenerated' })
  })

  it('requests a new illustration for the selected post and explains a refused one', async () => {
    mocks.newIllustration.mockRejectedValueOnce(Object.assign(new Error('Invalid transition'), { status: 409 }))
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    act(() => result.current.selectPost('p1'))
    expect(result.current.canRequestIllustration).toBe(true)

    await act(async () => { await result.current.newIllustration() })
    expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: 'admin.socialPosts.actions.conflict' })

    await act(async () => { await result.current.newIllustration() })
    expect(mocks.newIllustration).toHaveBeenLastCalledWith('p1')
    expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'success', message: 'admin.socialPosts.media.requested' })
  })

  it('does not offer a new illustration for a published post', () => {
    mocks.detail.mockImplementation((id?: string) => ({ data: id ? { ...post, status: 'PUBLISHED' } : undefined, isLoading: false, isError: false, refetch: vi.fn() }))
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    act(() => result.current.selectPost('p1'))
    expect(result.current.canRequestIllustration).toBe(false)
  })

  it('edits the copy from the current text, validates the S4 limits and saves', async () => {
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    act(() => result.current.selectPost('p1'))
    act(() => result.current.startReject())
    act(() => result.current.startEdit())
    expect(result.current.editing).toBe(true)
    expect(result.current.rejecting).toBe(false)
    expect(result.current.draft.hook).toBe('Tres datos sobre el Malbec')
    expect(result.current.draftErrors).toEqual([])

    act(() => result.current.updateDraft('hook', ''))
    expect(result.current.draftErrors).toEqual(['HOOK_REQUIRED'])
    await act(async () => { await result.current.saveEdit() })
    expect(mocks.update).not.toHaveBeenCalled()

    act(() => result.current.updateDraft('hook', 'Nuevo gancho'))
    act(() => result.current.addSlide())
    expect(result.current.draft.slides).toHaveLength(4)
    act(() => result.current.updateSlide(3, 'title', 'Cuarta'))
    act(() => result.current.updateSlide(3, 'body', 'Placa extra.'))
    expect(result.current.draft.slides[3]).toEqual({ title: 'Cuarta', body: 'Placa extra.' })
    act(() => result.current.removeSlide(3))
    expect(result.current.draft.slides).toHaveLength(3)

    await act(async () => { await result.current.saveEdit() })
    expect(mocks.update).toHaveBeenCalledWith({ id: 'p1', language: 'es', draft: expect.objectContaining({ hook: 'Nuevo gancho' }) })
    expect(result.current.editing).toBe(false)
  })

  it('starts on the content language of the UI and switches the copy, actions and editor to the other one', async () => {
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    act(() => result.current.selectPost('p1'))
    expect(result.current.contentLanguage).toBe('es')
    expect(result.current.copy).toBe(copy)

    act(() => result.current.setContentLanguage('en'))
    expect(result.current.contentLanguage).toBe('en')
    expect(result.current.copy).toBe(english)
    expect(result.current.actions).toEqual(['approve', 'reject', 'edit', 'regenerate'])

    act(() => result.current.startEdit())
    expect(result.current.draft.hook).toBe('Three facts about Malbec')
    expect(result.current.draft.cta).toBe('Which one surprised you?')
    expect(result.current.draftErrors).toEqual([])
    act(() => result.current.updateDraft('hook', 'A new hook'))
    await act(async () => { await result.current.saveEdit() })
    expect(mocks.update).toHaveBeenCalledWith({ id: 'p1', language: 'en', draft: expect.objectContaining({ hook: 'A new hook', cta: 'Which one surprised you?' }) })

    act(() => result.current.selectPost('p1'))
    expect(result.current.contentLanguage).toBe('en')
  })

  it('starts on English for an English UI', () => {
    mocks.uiLanguage = 'en-US'
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    act(() => result.current.selectPost('p1'))
    expect(result.current.contentLanguage).toBe('en')
    expect(result.current.copy).toBe(english)
  })

  it('validates the caption limit with the legal line of the language being edited', () => {
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    act(() => result.current.selectPost('p1'))
    act(() => result.current.setContentLanguage('en'))
    act(() => result.current.startEdit())
    act(() => result.current.updateDraft('caption', 'c'.repeat(600 - LEGAL_LINES.en.length - 2)))
    expect(result.current.draftErrors).toEqual([])
    act(() => result.current.updateDraft('caption', 'c'.repeat(600 - LEGAL_LINES.en.length - 1)))
    expect(result.current.draftErrors).toEqual(['CAPTION_TOO_LONG'])
  })

  it('leaves a missing language without copy or edit action, keeping regenerate', () => {
    mocks.detail.mockImplementation((id?: string) => ({ data: id ? { ...post, copies: { es: copy, en: null } } : undefined, isLoading: false, isError: false, refetch: vi.fn() }))
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    act(() => result.current.selectPost('p1'))
    act(() => result.current.setContentLanguage('en'))
    expect(result.current.copy).toBeNull()
    expect(result.current.actions).toEqual(['approve', 'reject', 'regenerate'])
    expect(result.current.canRequestIllustration).toBe(true)
  })

  it('keeps the editor open when saving fails and starts from an empty draft without copy', async () => {
    mocks.update.mockRejectedValueOnce(new Error('offline'))
    mocks.detail.mockImplementation((id?: string) => ({ data: id ? { ...post, copies: { es: null, en: null } } : undefined, isLoading: false, isError: false, refetch: vi.fn() }))
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    act(() => result.current.selectPost('p1'))
    act(() => result.current.startEdit())
    expect(result.current.draft.hook).toBe('')
    expect(result.current.draftErrors).not.toEqual([])

    mocks.detail.mockImplementation((id?: string) => ({ data: id ? post : undefined, isLoading: false, isError: false, refetch: vi.fn() }))
    act(() => result.current.selectPost('p1'))
    expect(result.current.editing).toBe(false)
    act(() => result.current.startEdit())
    await act(async () => { await result.current.saveEdit() })
    expect(result.current.editing).toBe(true)
    act(() => result.current.cancelEdit())
    expect(result.current.editing).toBe(false)
  })

  it('plans the next window and keeps the created count', async () => {
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    await act(async () => { await result.current.planNow() })
    expect(result.current.lastPlan).toEqual({ created: 5, from: '2026-11-16', to: '2026-11-29' })
    expect(mocks.toast).toHaveBeenCalledWith({
      type: 'success',
      message: 'admin.socialPosts.planned {"count":5,"from":"2026-11-16","to":"2026-11-29"}',
    })

    mocks.plan.mockRejectedValueOnce(new Error('offline'))
    await act(async () => { await result.current.planNow() })
    expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: 'admin.socialPosts.planError' })
  })

  it('refreshes the queue while the AI writes the planned copy and stops after a few minutes', async () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
      expect(result.current.awaitingCopy).toBe(false)
      expect(mocks.list).toHaveBeenLastCalledWith(0, 20, 'PENDING_APPROVAL', false)

      await act(async () => { await result.current.planNow() })
      expect(result.current.awaitingCopy).toBe(true)
      expect(mocks.list).toHaveBeenLastCalledWith(0, 20, 'PENDING_APPROVAL', 10_000)

      act(() => { vi.advanceTimersByTime(5 * 60_000) })
      expect(result.current.awaitingCopy).toBe(false)
      expect(mocks.list).toHaveBeenLastCalledWith(0, 20, 'PENDING_APPROVAL', false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not wait for copy when the window was already planned', async () => {
    mocks.plan.mockResolvedValueOnce({ created: 0, from: '2026-11-16', to: '2026-11-29' })
    const { result } = renderHook(() => useAdminSocialPostsViewModel(today))
    await act(async () => { await result.current.planNow() })
    expect(result.current.awaitingCopy).toBe(false)
  })

  it('reports work in progress while any review action runs', () => {
    mocks.pending.regenerate = true
    const { result, rerender } = renderHook(() => useAdminSocialPostsViewModel(today))
    expect(result.current.working).toBe(true)
    expect(result.current.isPlanning).toBe(false)

    mocks.pending.regenerate = false
    mocks.pending.illustration = true
    rerender()
    expect(result.current.working).toBe(true)
  })
})
