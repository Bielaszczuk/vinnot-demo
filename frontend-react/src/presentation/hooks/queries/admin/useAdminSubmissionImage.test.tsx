import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminService } from '@services/admin.service'
import { useAdminSubmissionImage } from './useAdminSubmissionImage'

vi.mock('@services/admin.service', () => ({ adminService: { getWineSubmissionImage: vi.fn() } }))
beforeEach(() => {
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn().mockReturnValue('blob:label')
    static revokeObjectURL = vi.fn()
  })
})
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks() })

describe('private submission preview recovery', () => {
  it('distinguishes unavailable from failed download, retries and revokes on close', async () => {
    vi.mocked(adminService.getWineSubmissionImage).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(new Blob())
    const { result, rerender, unmount } = renderHook(({ id, available }) => useAdminSubmissionImage(id, available), {
      initialProps: { id: 'a' as string | undefined, available: false },
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(adminService.getWineSubmissionImage).not.toHaveBeenCalled()
    rerender({ id: 'a', available: true })
    await waitFor(() => expect(result.current.isError).toBe(true))
    act(() => result.current.retry())
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.url).toBe('blob:label'))
    rerender({ id: undefined, available: false })
    expect(result.current.url).toBeUndefined()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:label')
    rerender({ id: 'a', available: true })
    expect(result.current.url).toBeUndefined()
    await waitFor(() => expect(result.current.url).toBe('blob:label'))
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('supports browser decode errors and a fresh download on retry', async () => {
    vi.mocked(adminService.getWineSubmissionImage).mockResolvedValue(new Blob())
    const { result, unmount } = renderHook(() => useAdminSubmissionImage('a', true))
    await waitFor(() => expect(result.current.url).toBeDefined())
    const previousImageError = result.current.onImageError
    act(() => result.current.onImageError())
    expect(result.current.isError).toBe(true)
    expect(result.current.url).toBeUndefined()
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.url).toBeDefined())
    expect(adminService.getWineSubmissionImage).toHaveBeenCalledTimes(2)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    act(() => previousImageError())
    expect(result.current.url).toBe('blob:label')
    expect(result.current.isError).toBe(false)
    unmount()
  })

  it.each([false, true])('ignores a late response from a previous selection (failure=%s)', async (failure) => {
    let resolve!: (blob: Blob) => void
    let reject!: (error: Error) => void
    vi.mocked(adminService.getWineSubmissionImage).mockReturnValueOnce(new Promise((res, rej) => { resolve = res; reject = rej }))
      .mockResolvedValueOnce(new Blob())
    const { result, rerender, unmount } = renderHook(({ id }) => useAdminSubmissionImage(id, true), { initialProps: { id: 'a' } })
    rerender({ id: 'b' })
    await waitFor(() => expect(result.current.url).toBe('blob:label'))
    await act(async () => { if (failure) reject(new Error('late')); else resolve(new Blob()) })
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(result.current.url).toBe('blob:label')
    expect(result.current.isError).toBe(false)
    unmount()
  })
})
