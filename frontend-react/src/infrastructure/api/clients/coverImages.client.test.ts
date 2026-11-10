import { expect, it, vi } from 'vitest'
import { coverImagesClient } from './coverImages.client'
import { http } from '@infrastructure/http/http'
vi.mock('@infrastructure/http/http', () => ({ http: { post: vi.fn(), get: vi.fn(), defaults: { baseURL: 'http://localhost:8080/api' } } }))
it('multipart upload uses a single request with the kind and file', async () => {
  const file = new File(['photo'], 'x.png', { type: 'image/png' })
  const signal = new AbortController().signal
  vi.mocked(http.post).mockResolvedValueOnce({ data: { id: 'id' } })
  await coverImagesClient.upload(file, 'EVENT', signal)
  const [path, data, options] = vi.mocked(http.post).mock.calls[0]!
  expect(path).toBe('/uploads/covers')
  expect((data as FormData).get('file')).toBe(file)
  expect((data as FormData).get('kind')).toBe('EVENT')
  expect(options?.signal).toBe(signal)
})
it('private preview stays on the configured API and cannot leak credentials to an external host', async () => {
  const path = '/api/uploads/covers/00000000-0000-4000-8000-000000000001.webp'
  const signal = new AbortController().signal
  vi.mocked(http.get).mockResolvedValueOnce({ data: new Blob(['photo']) })
  await coverImagesClient.preview('https://api-dev.vinnot.com' + path, signal)
  expect(http.get).toHaveBeenCalledWith(path.slice(4), { signal, responseType: 'blob' })
  await expect(coverImagesClient.preview('https://evil.example' + path, signal)).rejects.toThrow('INVALID_COVER_REFERENCE')
  expect(http.get).toHaveBeenCalledTimes(1)
})
it('private preview also accepts covers addressed through the configured API host', async () => {
  const path = '/api/uploads/covers/00000000-0000-4000-8000-000000000001.webp'
  const signal = new AbortController().signal
  vi.mocked(http.get).mockClear().mockResolvedValueOnce({ data: new Blob(['photo']) })
  await coverImagesClient.preview('http://localhost:8080' + path, signal)
  expect(http.get).toHaveBeenCalledWith(path.slice(4), { signal, responseType: 'blob' })
  await expect(coverImagesClient.preview('http://localhost:9999' + path, signal)).rejects.toThrow('INVALID_COVER_REFERENCE')
  expect(http.get).toHaveBeenCalledTimes(1)
})
