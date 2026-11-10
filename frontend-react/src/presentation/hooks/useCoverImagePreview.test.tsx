import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useCoverImagePreview } from './useCoverImagePreview'
import { coverImagesService } from '@application/services/coverImages.service'
vi.mock('@application/services/coverImages.service', () => ({ coverImagesService: { preview: vi.fn() } }))
const create = vi.fn(), revoke = vi.fn()
Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create })
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
beforeEach(() => { vi.clearAllMocks(); create.mockReturnValue('blob:cover') })
it('legacy images remain native; a managed cover is fetched once and its local URL is released', async () => {
  const url = '/api/uploads/covers/00000000-0000-4000-8000-000000000001.webp'
  vi.mocked(coverImagesService.preview).mockResolvedValue(new Blob(['webp']))
  const hook = renderHook(({ value }) => useCoverImagePreview(value), { initialProps: { value: 'https://legacy.example/x.jpg' } })
  expect(hook.result.current.image).toBe('https://legacy.example/x.jpg')
  expect(coverImagesService.preview).not.toHaveBeenCalled()
  hook.rerender({ value: url })
  await waitFor(() => expect(hook.result.current.image).toBe('blob:cover'))
  hook.rerender({ value: url })
  expect(coverImagesService.preview).toHaveBeenCalledTimes(1)
  hook.unmount()
  expect(revoke).toHaveBeenCalledWith('blob:cover')
})
it('changing the resource cancels its old preview and ignores late responses', async () => {
  let resolve!: (value: Blob) => void
  vi.mocked(coverImagesService.preview).mockReturnValueOnce(new Promise(done => { resolve = done }))
  const hook = renderHook(({ value }) => useCoverImagePreview(value), { initialProps: { value: '/api/uploads/covers/old.webp' } })
  const signal = vi.mocked(coverImagesService.preview).mock.calls[0]![1]
  hook.rerender({ value: 'https://legacy.example/new.jpg' })
  await act(async () => resolve(new Blob(['old'])))
  expect(signal.aborted).toBe(true)
  expect(create).not.toHaveBeenCalled()
  expect(hook.result.current.image).toBe('https://legacy.example/new.jpg')
})
it('reports loading while a managed cover is fetched, and stops loading when it fails', async () => {
  let resolve!: (value: Blob) => void
  vi.mocked(coverImagesService.preview)
    .mockReturnValueOnce(new Promise(done => { resolve = done }))
    .mockRejectedValueOnce(new Error('offline'))
  const hook = renderHook(({ value }) => useCoverImagePreview(value), { initialProps: { value: '/api/uploads/covers/a.webp' } })
  expect(hook.result.current).toMatchObject({ image: null, loading: true })
  await act(async () => resolve(new Blob(['a'])))
  expect(hook.result.current).toMatchObject({ image: 'blob:cover', loading: false })
  hook.rerender({ value: '/api/uploads/covers/b.webp' })
  expect(hook.result.current.loading).toBe(true)
  await waitFor(() => expect(hook.result.current).toMatchObject({ image: null, loading: false }))
  hook.rerender({ value: 'https://legacy.example/x.jpg' })
  expect(hook.result.current.loading).toBe(false)
})
