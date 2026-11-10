import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useCoverImageUpload } from './useCoverImageUpload'
import { coverImagesService } from '@application/services/coverImages.service'
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@application/services/coverImages.service', () => ({ coverImagesService: { upload: vi.fn(), preview: vi.fn() } }))
it('one pending upload disables save and a closed editor cannot receive late results', async () => {
  let resolve!: (image: { id: string; imageUrl: string; width: number; height: number; size: number }) => void
  vi.mocked(coverImagesService.upload).mockReturnValueOnce(new Promise(done => { resolve = done }))
  const changed = vi.fn(), busy = vi.fn()
  const hook = renderHook(() => useCoverImageUpload('EVENT', null, changed, busy))
  const file = new File(['photo'], 'x.png', { type: 'image/png' })
  act(() => { void hook.result.current.upload(file); void hook.result.current.upload(file) })
  expect(coverImagesService.upload).toHaveBeenCalledTimes(1)
  expect(busy).toHaveBeenCalledWith(true)
  hook.unmount()
  await act(async () => resolve({ id: 'id', imageUrl: '/api/uploads/covers/id.webp', width: 1, height: 1, size: 1 }))
  expect(changed).not.toHaveBeenCalled()
  expect(busy).toHaveBeenLastCalledWith(false)
})
it('failed upload leaves the previous reference intact and reports an actionable error', async () => {
  vi.mocked(coverImagesService.upload).mockRejectedValueOnce(new Error('network'))
  const changed = vi.fn(), busy = vi.fn()
  const hook = renderHook(() => useCoverImageUpload('EVENT', 'https://legacy.example/x.jpg', changed, busy))
  await act(async () => hook.result.current.upload(new File(['x'], 'x.png', { type: 'image/png' })))
  await waitFor(() => expect(hook.result.current.error).toBe('media.failed'))
  expect(hook.result.current.preview).toBe('https://legacy.example/x.jpg')
  expect(changed).not.toHaveBeenCalled()
  hook.unmount()
})

const urls = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:picked')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  URL.createObjectURL = urls.create
  URL.revokeObjectURL = urls.revoke
})

it('opens a picked photo for framing, then uploads the confirmed crop instead of the original', async () => {
  vi.mocked(coverImagesService.upload).mockResolvedValueOnce({ id: 'id', imageUrl: 'https://cdn.example/c.webp', width: 1, height: 1, size: 1 })
  const changed = vi.fn()
  const hook = renderHook(() => useCoverImageUpload('WINE_ROUTE', null, changed, vi.fn()))
  const picked = new File(['photo'], 'x.png', { type: 'image/png' })
  act(() => hook.result.current.pick(picked))
  expect(hook.result.current.cropping).toEqual({ file: picked, url: 'blob:picked' })
  expect(coverImagesService.upload).not.toHaveBeenCalled()
  const cropped = new File(['jpeg'], 'x.jpg', { type: 'image/jpeg' })
  await act(async () => hook.result.current.confirmCrop(cropped))
  expect(hook.result.current.cropping).toBeNull()
  expect(coverImagesService.upload).toHaveBeenCalledWith(cropped, 'WINE_ROUTE', expect.any(AbortSignal))
  expect(changed).toHaveBeenCalledWith('https://cdn.example/c.webp')
})

it('cancelling the framing uploads nothing; a refused file or a pick during an upload never opens it', async () => {
  let resolve!: (image: { id: string; imageUrl: string; width: number; height: number; size: number }) => void
  const hook = renderHook(() => useCoverImageUpload('EVENT', null, vi.fn(), vi.fn()))
  const picked = new File(['photo'], 'x.png', { type: 'image/png' })
  act(() => hook.result.current.pick(picked))
  act(() => hook.result.current.cancelCrop())
  expect(hook.result.current.cropping).toBeNull()
  expect(coverImagesService.upload).not.toHaveBeenCalled()

  act(() => hook.result.current.pick(new File(['x'], 'x.pdf', { type: 'application/pdf' })))
  expect(hook.result.current.error).toBe('media.invalid')
  act(() => hook.result.current.pick())
  expect(hook.result.current.cropping).toBeNull()

  vi.mocked(coverImagesService.upload).mockReturnValueOnce(new Promise(done => { resolve = done }))
  act(() => { void hook.result.current.upload(picked) })
  act(() => hook.result.current.pick(picked))
  expect(hook.result.current.cropping).toBeNull()
  await act(async () => resolve({ id: 'id', imageUrl: '/x', width: 1, height: 1, size: 1 }))
})
