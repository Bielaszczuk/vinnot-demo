import { expect, it, vi } from 'vitest'
import { catalogImagesService } from './catalogImages.service'
import { catalogImagesClient } from '@infrastructure/api/clients/catalogImages.client'
vi.mock('@infrastructure/api/clients/catalogImages.client', () => ({ catalogImagesClient: { upload: vi.fn() } }))

it('uploads an accepted photo and returns its catalog URL', async () => {
  const file = new File(['photo'], 'bottle.webp', { type: 'image/webp' })
  const signal = new AbortController().signal
  vi.mocked(catalogImagesClient.upload).mockResolvedValueOnce('https://cdn.example/bottle.jpg')
  await expect(catalogImagesService.upload(file, signal)).resolves.toBe('https://cdn.example/bottle.jpg')
  expect(catalogImagesClient.upload).toHaveBeenCalledWith(file, signal)
})

it('refuses other formats before any request', async () => {
  const file = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })
  await expect(catalogImagesService.upload(file, new AbortController().signal)).rejects.toThrow('INVALID_CATALOG_IMAGE')
  expect(catalogImagesClient.upload).not.toHaveBeenCalled()
})
