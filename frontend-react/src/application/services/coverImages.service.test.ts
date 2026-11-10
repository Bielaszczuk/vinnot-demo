import { describe, it, expect, vi } from 'vitest'
import { coverImagesService } from './coverImages.service'
import { coverImagesClient } from '@infrastructure/api/clients/coverImages.client'
vi.mock('@infrastructure/api/clients/coverImages.client', () => ({ coverImagesClient: { upload: vi.fn(), preview: vi.fn() } }))
describe('cover images', () => {
  it('rejects unsupported and oversized files before HTTP', () => {
    const signal = new AbortController().signal
    expect(() => coverImagesService.upload(new File(['image'], 'photo.heic', { type: 'image/heic' }), 'EVENT', signal)).toThrow('INVALID_COVER_IMAGE')
    expect(() => coverImagesService.upload(new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }), 'EVENT', signal)).toThrow()
    expect(coverImagesClient.upload).not.toHaveBeenCalled()
  })
  it('preserves the resource type, cancellation and authenticated preview', async () => {
    const file = new File(['image'], 'photo.png', { type: 'image/png' })
    const signal = new AbortController().signal
    const result = { id: 'id', imageUrl: '/api/uploads/covers/id.webp', width: 1, height: 1, size: 5 }
    vi.mocked(coverImagesClient.upload).mockResolvedValueOnce(result)
    expect(await coverImagesService.upload(file, 'WINE_ROUTE', signal)).toEqual(result)
    expect(coverImagesClient.upload).toHaveBeenCalledWith(file, 'WINE_ROUTE', signal)
    expect(await coverImagesService.preview(result.imageUrl, signal)).toBe(file)
    expect(coverImagesClient.preview).not.toHaveBeenCalled()
  })
  it('downloads a private cover once per session and again after the session ends', async () => {
    const signal = new AbortController().signal
    const url = '/api/uploads/covers/00000000-0000-4000-8000-000000000002.webp'
    const blob = new Blob(['image'])
    vi.mocked(coverImagesClient.preview).mockResolvedValue(blob)
    expect(await coverImagesService.preview(url, signal)).toBe(blob)
    expect(await coverImagesService.preview(url, signal)).toBe(blob)
    expect(coverImagesClient.preview).toHaveBeenCalledTimes(1)
    coverImagesService.clearPreviews()
    await coverImagesService.preview(url, signal)
    expect(coverImagesClient.preview).toHaveBeenCalledTimes(2)
  })
})
