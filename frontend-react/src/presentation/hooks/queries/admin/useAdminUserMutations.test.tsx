import { createElement, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { adminService } from '@services/admin.service'
import { queryKeys } from '../queryKeys'
import { useUpdateAdminUser, useUpdateUserRole } from './useAdminUserMutations'

function setup() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  cache.setQueryData(queryKeys.admin.users.all(), { items: [] })
  const wrapper = ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client: cache }, children)
  return { cache, wrapper }
}

afterEach(() => vi.restoreAllMocks())

it('saves both names of an account and refreshes the users list only after it succeeds', async () => {
  const { cache, wrapper } = setup()
  const { result, unmount } = renderHook(() => useUpdateAdminUser(), { wrapper })
  const update = vi.spyOn(adminService, 'updateUser').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined)
  const names = { firstName: 'Ana María', lastName: 'Pérez' }
  await act(async () => { await expect(result.current.mutateAsync({ userId: 'user-1', update: names })).rejects.toThrow('offline') })
  expect(cache.getQueryState(queryKeys.admin.users.all())?.isInvalidated).toBe(false)
  await act(async () => { await result.current.mutateAsync({ userId: 'user-1', update: names }) })
  expect(update).toHaveBeenLastCalledWith('user-1', names)
  expect(cache.getQueryState(queryKeys.admin.users.all())?.isInvalidated).toBe(true)
  unmount()
  cache.clear()
})

it('keeps the role change payload as { userId, role }', async () => {
  const { cache, wrapper } = setup()
  const { result, unmount } = renderHook(() => useUpdateUserRole(), { wrapper })
  const updateRole = vi.spyOn(adminService, 'updateUserRole').mockResolvedValue(undefined)
  await act(async () => { await result.current.mutateAsync({ userId: 'user-1', role: 'ROLE_MODERATOR' }) })
  expect(updateRole).toHaveBeenCalledWith('user-1', 'ROLE_MODERATOR')
  unmount()
  cache.clear()
})
