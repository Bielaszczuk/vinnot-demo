import { createElement, type PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SocialAccount } from '@domain/admin/socialAccount'
import { useSocialAccountsPanel } from './useSocialAccountsPanel'

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connectState: { isPending: false, isSuccess: false, variables: undefined as string | undefined },
  disconnectState: { isPending: false, variables: undefined as string | undefined },
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: 'es-AR', resolvedLanguage: 'es-AR' },
  }),
}))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@services/adminSocialAccounts.service', () => ({
  socialAccountError: (error: unknown) => (error as { key: string }).key,
}))
vi.mock('@hooks/queries/admin/useAdminSocialAccounts', () => ({
  useAdminSocialAccounts: () => mocks.query(),
  useConnectSocialAccount: () => ({ mutateAsync: mocks.connect, ...mocks.connectState }),
  useDisconnectSocialAccount: () => ({ mutateAsync: mocks.disconnect, ...mocks.disconnectState }),
}))

const threads: SocialAccount = {
  network: 'THREADS', mode: 'OAUTH', configured: true, connected: true, accountId: 't-1', displayName: '@vinnot',
  status: 'CONNECTED', expiresAt: null, lastError: null,
}

function renderPanel(url = '/admin/social-posts') {
  const wrapper = ({ children }: PropsWithChildren) => createElement(MemoryRouter, { initialEntries: [url] }, children)
  return renderHook(() => ({ panel: useSocialAccountsPanel(), location: useLocation() }), { wrapper })
}

describe('social accounts panel view model', () => {
  const refetch = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.connectState = { isPending: false, isSuccess: false, variables: undefined }
    mocks.disconnectState = { isPending: false, variables: undefined }
    mocks.query.mockReturnValue({ data: [threads], isLoading: false, isError: false, refetch })
  })

  it('exposes the connections and their loading state', () => {
    const { result } = renderPanel()
    expect(result.current.panel.accounts).toEqual([threads])
    expect(result.current.panel.loading).toBe(false)
    expect(result.current.panel.failed).toBe(false)
    expect(result.current.panel.busy).toBeNull()
    expect(result.current.panel.notice).toBeNull()
    result.current.panel.refetch()
    expect(refetch).toHaveBeenCalledTimes(1)

    mocks.query.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch })
    expect(renderPanel().result.current.panel.accounts).toEqual([])
  })

  it('shows the OAuth return once and removes it from the URL, keeping other parameters', () => {
    const { result } = renderPanel('/admin/social-posts?tab=1&account=threads&result=connected')
    expect(result.current.panel.notice).toEqual({ network: 'THREADS', outcome: 'connected' })
    expect(result.current.location.search).toBe('?tab=1')

    act(() => result.current.panel.dismissNotice())
    expect(result.current.panel.notice).toBeNull()
  })

  it('reads a failed OAuth return and leaves a URL without one untouched', () => {
    const failed = renderPanel('/admin/social-posts?result=error')
    expect(failed.result.current.panel.notice).toEqual({ network: null, outcome: 'error' })
    expect(failed.result.current.location.search).toBe('')

    const plain = renderPanel('/admin/social-posts?tab=1')
    expect(plain.result.current.panel.notice).toBeNull()
    expect(plain.result.current.location.search).toBe('?tab=1')
  })

  it('connects a network and explains why the backend refused it', async () => {
    mocks.connect.mockResolvedValueOnce(undefined).mockRejectedValueOnce({ key: 'encryptionKeyMissing' })
    const { result } = renderPanel()

    await act(async () => { await result.current.panel.connect('TIKTOK') })
    expect(mocks.connect).toHaveBeenCalledWith('TIKTOK')
    expect(mocks.toast).not.toHaveBeenCalled()

    await act(async () => { await result.current.panel.connect('TIKTOK') })
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'admin.socialPosts.accounts.errors.encryptionKeyMissing' })
  })

  it('disconnects a network, confirms it and explains a refusal', async () => {
    mocks.disconnect.mockResolvedValueOnce(undefined).mockRejectedValueOnce({ key: 'notConnected' })
    const { result } = renderPanel()

    await act(async () => { await result.current.panel.disconnect('THREADS') })
    expect(mocks.disconnect).toHaveBeenCalledWith('THREADS')
    expect(mocks.toast).toHaveBeenCalledWith({
      type: 'success', message: 'admin.socialPosts.accounts.disconnected {"network":"admin.socialPosts.networks.THREADS"}',
    })

    await act(async () => { await result.current.panel.disconnect('THREADS') })
    expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: 'admin.socialPosts.accounts.errors.notConnected' })
  })

  it('stays busy on the network being connected, also while the browser leaves, and on the one being disconnected', () => {
    mocks.connectState = { isPending: true, isSuccess: false, variables: 'TIKTOK' }
    expect(renderPanel().result.current.panel.busy).toBe('TIKTOK')

    mocks.connectState = { isPending: false, isSuccess: true, variables: 'THREADS' }
    expect(renderPanel().result.current.panel.busy).toBe('THREADS')

    mocks.connectState = { isPending: false, isSuccess: false, variables: undefined }
    mocks.disconnectState = { isPending: true, variables: 'TIKTOK' }
    expect(renderPanel().result.current.panel.busy).toBe('TIKTOK')
  })
})
