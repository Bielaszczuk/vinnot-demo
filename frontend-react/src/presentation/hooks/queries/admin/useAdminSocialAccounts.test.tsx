import { createElement, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminSocialAccountsService } from '@services/adminSocialAccounts.service'
import type { SocialAccount } from '@domain/admin/socialAccount'
import {
  socialAccountKeys,
  useAdminSocialAccounts,
  useConnectSocialAccount,
  useDisconnectSocialAccount,
} from './useAdminSocialAccounts'

afterEach(() => vi.restoreAllMocks())

const threads: SocialAccount = {
  network: 'THREADS', mode: 'OAUTH', configured: true, connected: true, accountId: 't-1', displayName: '@vinnot',
  status: 'CONNECTED', expiresAt: null, lastError: null,
}

function setup() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client: cache }, children)
  return { cache, wrapper }
}

describe('admin social account queries', () => {
  it('reads the connections through the service', async () => {
    const { cache, wrapper } = setup()
    vi.spyOn(adminSocialAccountsService, 'getAccounts').mockResolvedValue([threads])

    const { result, unmount } = renderHook(() => useAdminSocialAccounts(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual([threads]))
    expect(socialAccountKeys.all()).toEqual(['admin', 'social-accounts'])
    unmount()
    cache.clear()
  })

  it('connects a network through the service', async () => {
    const { cache, wrapper } = setup()
    vi.spyOn(adminSocialAccountsService, 'connect').mockResolvedValue(undefined)

    const { result, unmount } = renderHook(() => useConnectSocialAccount(), { wrapper })
    await act(async () => { await result.current.mutateAsync('TIKTOK') })

    expect(adminSocialAccountsService.connect).toHaveBeenCalledWith('TIKTOK')
    unmount()
    cache.clear()
  })

  it('disconnects a network and reads the connections again', async () => {
    const { cache, wrapper } = setup()
    cache.setQueryData(socialAccountKeys.all(), [threads])
    vi.spyOn(adminSocialAccountsService, 'disconnect').mockResolvedValue(undefined)

    const { result, unmount } = renderHook(() => useDisconnectSocialAccount(), { wrapper })
    await act(async () => { await result.current.mutateAsync('THREADS') })

    expect(adminSocialAccountsService.disconnect).toHaveBeenCalledWith('THREADS')
    expect(cache.getQueryState(socialAccountKeys.all())?.isInvalidated).toBe(true)
    unmount()
    cache.clear()
  })
})
