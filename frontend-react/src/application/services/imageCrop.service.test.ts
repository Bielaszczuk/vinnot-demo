import { expect, it, vi } from 'vitest'
import { imageCropService } from './imageCrop.service'
import { canvasImageCropper } from '@infrastructure/media/canvasImageCropper'

vi.mock('@infrastructure/media/canvasImageCropper', () => ({ canvasImageCropper: { crop: vi.fn() } }))

it('exports the framed part of the photo as a JPEG capped at 2400 px, keeping the picked name', async () => {
  const cropped = new File(['jpeg'], 'sunset.jpg', { type: 'image/jpeg' })
  vi.mocked(canvasImageCropper.crop).mockResolvedValueOnce(cropped)
  const file = new File(['photo'], 'sunset.png', { type: 'image/png' })

  await expect(imageCropService.crop({
    file, natural: { width: 4000, height: 3000 }, aspect: 16 / 9, zoom: 1, offset: { x: 0, y: 0 },
  })).resolves.toBe(cropped)

  expect(canvasImageCropper.crop).toHaveBeenCalledWith(
    file,
    { width: 4000, height: 3000 },
    { x: 0, y: 375, width: 4000, height: 2250 },
    { width: 2400, height: 1350 },
    'sunset.jpg',
  )
})
