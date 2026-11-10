import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnnouncementComposerViewModel } from './useAnnouncementComposerViewModel'

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  test: vi.fn(),
  send: vi.fn(),
  preview: vi.fn(),
  reach: vi.fn(),
  regions: vi.fn(),
  errorCode: vi.fn(),
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/useDebounce', () => ({ useDebounce: <T,>(value: T) => value }))
vi.mock('@services/adminNotifications.service', () => ({ announcementErrorCode: mocks.errorCode }))
vi.mock('@hooks/queries/admin', () => ({
  useAdminCountries: () => ({ data: [{ id: 'ar', code: 'ar', name: 'Argentina' }] }),
  useAdminRegions: (countryId: string | null) => { mocks.regions(countryId); return { data: [] } },
  useAnnouncementPreview: (...args: unknown[]) => { mocks.preview(...args); return { data: undefined, isFetching: false, isError: false } },
  useAnnouncementReach: (...args: unknown[]) => { mocks.reach(...args); return { data: { email: 3, push: 2, accounts: 4 }, isFetching: false } },
  useTestAnnouncement: () => ({ mutateAsync: mocks.test, isPending: false }),
  useSendAnnouncement: () => ({ mutateAsync: mocks.send, isPending: false }),
}))

function write(result: { current: ReturnType<typeof useAnnouncementComposerViewModel> }) {
  act(() => result.current.updateVersion({ title: 'Vendimia', body: 'Catas todo el mes.' }))
}

describe('announcement composer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('previews the current language only once its title and body are valid', () => {
    const { result } = renderHook(useAnnouncementComposerViewModel)
    expect(mocks.preview).toHaveBeenLastCalledWith('NEWS', 'es', null)
    expect(result.current.errors).toEqual(['CONTENT_REQUIRED'])

    write(result)

    expect(mocks.preview).toHaveBeenLastCalledWith('NEWS', 'es', { title: 'Vendimia', body: 'Catas todo el mes.' })
    expect(result.current.errors).toEqual([])
    act(() => result.current.setLanguage('en'))
    expect(mocks.preview).toHaveBeenLastCalledWith('NEWS', 'en', null)
    expect(result.current.languages).toEqual(['es'])
  })

  it('counts the reach for the kind and segment, and a new country clears the region', () => {
    const { result } = renderHook(useAnnouncementComposerViewModel)
    act(() => result.current.setKind('SERVICE'))
    act(() => result.current.updateAudience({ regionId: 'mendoza', role: 'PARTNER', push: false }))

    expect(mocks.reach).toHaveBeenLastCalledWith('SERVICE',
      { email: true, push: false, language: null, countryId: null, regionId: 'mendoza', role: 'PARTNER' })
    expect(result.current.reachSettled).toBe(true)
    act(() => result.current.selectCountry('ar'))
    expect(result.current.draft.audience).toMatchObject({ countryId: 'ar', regionId: null })
    expect(mocks.regions).toHaveBeenLastCalledWith('ar')
  })

  it('tests the draft and says by which channels it went', async () => {
    mocks.test.mockResolvedValue({ email: 1, push: 0, accounts: 1 })
    const { result } = renderHook(useAnnouncementComposerViewModel)
    write(result)

    await act(() => result.current.sendTest())

    expect(mocks.test).toHaveBeenCalledWith(expect.objectContaining({ kind: 'NEWS' }))
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'admin.notifications.composer.testSentEmail' })
  })

  it('sends after confirming and starts a fresh draft', async () => {
    mocks.send.mockResolvedValue({ recipients: 4 })
    const { result } = renderHook(useAnnouncementComposerViewModel)
    write(result)
    act(() => result.current.openConfirm())

    await act(() => result.current.send())

    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'admin.notifications.composer.sent' })
    expect(result.current.confirming).toBe(false)
    expect(result.current.draft.versions.es).toEqual({ title: '', body: '' })
  })

  it('retries the same draft with the same request id and an edited draft with a new one', async () => {
    mocks.send.mockRejectedValue(new Error('offline'))
    mocks.errorCode.mockReturnValue(null)
    const { result } = renderHook(useAnnouncementComposerViewModel)
    write(result)

    await act(() => result.current.send())
    await act(() => result.current.send())
    act(() => result.current.updateVersion({ title: 'Vendimia 2026' }))
    await act(() => result.current.send())

    const ids = mocks.send.mock.calls.map(([input]) => (input as { requestId: string }).requestId)
    expect(ids[0]).toEqual(expect.any(String))
    expect(ids[1]).toBe(ids[0])
    expect(ids[2]).not.toBe(ids[0])
  })

  it('explains a known refusal and keeps the draft', async () => {
    mocks.send.mockRejectedValue(new Error('refused'))
    mocks.errorCode.mockReturnValue('ANNOUNCEMENT_AUDIENCE_EMPTY')
    const { result } = renderHook(useAnnouncementComposerViewModel)
    write(result)

    await act(() => result.current.send())

    expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'admin.notifications.errors.ANNOUNCEMENT_AUDIENCE_EMPTY' })
    expect(result.current.draft.versions.es.title).toBe('Vendimia')
  })

  it('writes the toolbar format into the body', () => {
    const { result } = renderHook(useAnnouncementComposerViewModel)
    act(() => result.current.applyFormat('button'))
    expect(result.current.version.body).toBe('[[admin.notifications.composer.formatFallback.button]](https://)')
  })
})
