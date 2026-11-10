import { afterEach, expect, it, vi } from 'vitest'
import { catalogImagesClient } from './catalogImages.client'
import { http } from '@infrastructure/http/http'
vi.mock('@infrastructure/http/http', () => ({ http: { post: vi.fn() } }))

afterEach(() => vi.unstubAllGlobals())

it('posts a JPEG or PNG as-is, as a data URL, and returns the stored image URL', async () => {
  const file = new File(['photo'], 'bottle.png', { type: 'image/png' })
  const signal = new AbortController().signal
  vi.mocked(http.post).mockResolvedValueOnce({ data: { imageUrl: 'https://cdn.example/bottle.jpg' } })
  await expect(catalogImagesClient.upload(file, signal)).resolves.toBe('https://cdn.example/bottle.jpg')
  const [path, body, options] = vi.mocked(http.post).mock.calls[0]!
  expect(path).toBe('/admin/catalog-images')
  expect((body as { dataUrl: string }).dataUrl).toBe(`data:image/png;base64,${btoa('photo')}`)
  expect(options?.signal).toBe(signal)
})

it('re-encodes GIF and WebP as JPEG, the formats the catalog endpoint stores', async () => {
  const close = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4, height: 6, close }))
  const context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }
  const canvas = { width: 0, height: 0, getContext: () => context, toDataURL: vi.fn(() => 'data:image/jpeg;base64,AAAA') }
  const createElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
    tag === 'canvas' ? (canvas as unknown as HTMLCanvasElement) : createElement(tag))
  vi.mocked(http.post).mockResolvedValueOnce({ data: { imageUrl: 'https://cdn.example/a.jpg' } })
  await catalogImagesClient.upload(new File(['gif'], 'a.webp', { type: 'image/webp' }), new AbortController().signal)
  expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.92)
  expect(context.fillRect).toHaveBeenCalledWith(0, 0, 4, 6)
  expect(close).toHaveBeenCalled()
  expect(vi.mocked(http.post).mock.calls.at(-1)![1]).toEqual({ dataUrl: 'data:image/jpeg;base64,AAAA' })
  vi.mocked(document.createElement).mockRestore()
})
