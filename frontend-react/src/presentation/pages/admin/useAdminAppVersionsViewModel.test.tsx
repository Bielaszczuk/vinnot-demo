import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppVersionSettings } from '@domain/admin/appVersion'
import { useAdminAppVersionsViewModel } from './useAdminAppVersionsViewModel'

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  change: vi.fn(),
  mutation: { isPending: false, variables: undefined as { platform: string } | undefined },
  data: undefined as AppVersionSettings | undefined,
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: 'en-US', resolvedLanguage: undefined },
  }),
}))
vi.mock('@services/adminAppVersions.service', () => ({
  appVersionErrorCode: (error: unknown) => (error as { code?: string }).code ?? null,
}))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/queries/admin', () => ({
  useAppVersionSettings: () => ({ data: mocks.data }),
  useSetMinimumAppVersion: () => ({ mutateAsync: mocks.change, ...mocks.mutation }),
}))

const settings: AppVersionSettings = {
  platforms: [
    { platform: 'IOS', minimumVersion: '0.3.0', updatedAt: '2026-10-25T12:00:00Z', updatedBy: 'admin@vinnot.test' },
    { platform: 'ANDROID', minimumVersion: null, updatedAt: null, updatedBy: null },
  ],
  recentChanges: [],
}

describe('app versions view model', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.data = settings
    mocks.mutation = { isPending: false, variables: undefined }
    mocks.change.mockResolvedValue(settings)
  })

  it('starts each field from the current minimum and tracks edits', () => {
    const { result } = renderHook(useAdminAppVersionsViewModel)
    expect(result.current.draftOf('IOS')).toBe('0.3.0')
    expect(result.current.draftOf('ANDROID')).toBe('')
    expect(result.current.changed('IOS')).toBe(false)

    act(() => result.current.edit('IOS', '0.4.0'))
    expect(result.current.draftOf('IOS')).toBe('0.4.0')
    expect(result.current.changed('IOS')).toBe(true)
    expect(result.current.platformLabel('IOS')).toBe('admin.appVersions.platforms.IOS')
    expect(result.current.formatDate('2026-10-25T12:00:00Z')).toEqual(expect.any(String))
  })

  it('reads empty fields while the settings load', () => {
    mocks.data = undefined
    const { result } = renderHook(useAdminAppVersionsViewModel)
    expect(result.current.draftOf('IOS')).toBe('')
  })

  it('rejects a malformed version before sending it', () => {
    const { result } = renderHook(useAdminAppVersionsViewModel)
    act(() => result.current.edit('IOS', '1.2'))
    act(() => result.current.save('IOS'))
    expect(result.current.invalid('IOS')).toBe(true)
    expect(mocks.change).not.toHaveBeenCalled()

    act(() => result.current.edit('IOS', '1.2.0'))
    expect(result.current.invalid('IOS')).toBe(false)
  })

  it('sends nothing when the value did not change', () => {
    const { result } = renderHook(useAdminAppVersionsViewModel)
    act(() => result.current.save('IOS'))
    expect(mocks.change).not.toHaveBeenCalled()
    expect(result.current.pendingRaise).toBeNull()
  })

  it('asks before raising a minimum, and applies it on confirmation', async () => {
    const { result } = renderHook(useAdminAppVersionsViewModel)
    act(() => result.current.edit('IOS', '0.10.0'))
    act(() => result.current.save('IOS'))
    expect(mocks.change).not.toHaveBeenCalled()
    expect(result.current.pendingRaise).toEqual({ platform: 'IOS', from: '0.3.0', to: '0.10.0' })

    await act(() => result.current.confirmRaise())
    expect(mocks.change).toHaveBeenCalledWith({ platform: 'IOS', minimumVersion: '0.10.0' })
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }))
    expect(result.current.pendingRaise).toBeNull()
  })

  it('asks before setting a first minimum and can be cancelled', async () => {
    const { result } = renderHook(useAdminAppVersionsViewModel)
    act(() => result.current.edit('ANDROID', ' 0.2.0 '))
    act(() => result.current.save('ANDROID'))
    expect(result.current.pendingRaise).toEqual({ platform: 'ANDROID', from: null, to: '0.2.0' })

    act(() => result.current.cancelRaise())
    expect(result.current.pendingRaise).toBeNull()
    await act(() => result.current.confirmRaise())
    expect(mocks.change).not.toHaveBeenCalled()
  })

  it('lowers a minimum at once', async () => {
    const { result } = renderHook(useAdminAppVersionsViewModel)
    act(() => result.current.edit('IOS', '0.2.9'))
    await act(async () => result.current.save('IOS'))
    expect(mocks.change).toHaveBeenCalledWith({ platform: 'IOS', minimumVersion: '0.2.9' })
  })

  it('clears a minimum, from the button or from an empty field', async () => {
    const { result } = renderHook(useAdminAppVersionsViewModel)
    await act(async () => result.current.clear('IOS'))
    expect(mocks.change).toHaveBeenLastCalledWith({ platform: 'IOS', minimumVersion: null })
    expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'success', message: 'admin.appVersions.cleared {"platform":"admin.appVersions.platforms.IOS"}' })

    act(() => result.current.edit('IOS', ''))
    await act(async () => result.current.save('IOS'))
    expect(mocks.change).toHaveBeenCalledTimes(2)
  })

  it('explains the refusals it knows and falls back to a generic message', async () => {
    const { result } = renderHook(useAdminAppVersionsViewModel)
    mocks.change.mockRejectedValueOnce(Object.assign(new Error('bad'), { code: 'INVALID_APP_VERSION' }))
    await act(async () => result.current.clear('IOS'))
    expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: 'admin.appVersions.errors.INVALID_APP_VERSION' })

    mocks.change.mockRejectedValueOnce(new Error('reauthentication cancelled'))
    await act(async () => result.current.clear('IOS'))
    expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: 'admin.appVersions.errors.generic' })
  })

  it('reports the platform being saved', () => {
    mocks.mutation = { isPending: true, variables: { platform: 'ANDROID' } }
    expect(renderHook(useAdminAppVersionsViewModel).result.current.saving).toBe('ANDROID')
    mocks.mutation = { isPending: true, variables: undefined }
    expect(renderHook(useAdminAppVersionsViewModel).result.current.saving).toBeNull()
  })
})
