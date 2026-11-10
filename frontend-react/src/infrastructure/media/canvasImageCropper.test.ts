import { afterEach, describe, expect, it, vi } from 'vitest'
import { CROP_JPEG_QUALITY, canvasImageCropper } from './canvasImageCropper'

const rect = { x: 0, y: 375, width: 4000, height: 2250 }
const natural = { width: 4000, height: 3000 }
const output = { width: 2400, height: 1350 }

function stubCanvas(blob: Blob | null = new Blob(['jpeg'], { type: 'image/jpeg' }), withContext = true) {
  const context = { fillStyle: '', imageSmoothingQuality: 'low', fillRect: vi.fn(), drawImage: vi.fn() }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => (withContext ? context : null)),
    toBlob: vi.fn((done: (value: Blob | null) => void) => done(blob)),
  }
  const createElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
    tag === 'canvas' ? (canvas as unknown as HTMLCanvasElement) : createElement(tag))
  return { canvas, context }
}

/** jsdom images never decode; this stands in for the browser `Image`. */
function fakeImage(decode: () => Promise<void>) {
  return class {
    src = ''
    naturalWidth = 4000
    naturalHeight = 3000
    decode = decode
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('canvasImageCropper', () => {
  it('draws the framed part, honouring EXIF orientation, into a JPEG of the output size', async () => {
    const close = vi.fn()
    const bitmap = { width: 4000, height: 3000, close }
    const decode = vi.fn().mockResolvedValue(bitmap)
    vi.stubGlobal('createImageBitmap', decode)
    const { canvas, context } = stubCanvas()
    const source = new File(['photo'], 'sunset.png', { type: 'image/png' })

    const file = await canvasImageCropper.crop(source, natural, rect, output, 'sunset.jpg')

    expect(decode).toHaveBeenCalledWith(source, { imageOrientation: 'from-image' })
    expect([canvas.width, canvas.height]).toEqual([2400, 1350])
    expect(context.fillStyle).toBe('#ffffff')
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 2400, 1350)
    expect(context.imageSmoothingQuality).toBe('high')
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 375, 4000, 2250, 0, 0, 2400, 1350)
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', CROP_JPEG_QUALITY)
    expect(CROP_JPEG_QUALITY).toBe(0.9)
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('sunset.jpg')
    expect(file.type).toBe('image/jpeg')
    expect(close).toHaveBeenCalledOnce()
  })

  it('scales the crop when the decoded photo differs in size from the preview', async () => {
    const bitmap = { width: 2000, height: 1500, close: vi.fn() }
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
    const { context } = stubCanvas()
    await canvasImageCropper.crop(new Blob(['x']), natural, rect, output, 'a.jpg')
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 187.5, 2000, 1125, 0, 0, 2400, 1350)
  })

  it('falls back to an image element where createImageBitmap is missing', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    const createObjectURL = vi.fn(() => 'blob:photo')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    const decode = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('Image', fakeImage(decode))
    const { context } = stubCanvas()

    await canvasImageCropper.crop(new Blob(['x']), natural, rect, output, 'a.jpg')

    expect(decode).toHaveBeenCalled()
    const image = context.drawImage.mock.calls[0]![0] as { src: string }
    expect(image.src).toBe('blob:photo')
    expect(context.drawImage.mock.calls[0]!.slice(1)).toEqual([0, 375, 4000, 2250, 0, 0, 2400, 1350])
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:photo')
  })

  it('releases the object URL when the image element cannot decode the file', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:broken'), revokeObjectURL }))
    vi.stubGlobal('Image', fakeImage(vi.fn().mockRejectedValue(new Error('EncodingError'))))
    await expect(canvasImageCropper.crop(new Blob(['x']), natural, rect, output, 'a.jpg')).rejects.toThrow('EncodingError')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:broken')
  })

  it('fails without a 2D context or an encoded blob, and still frees the decoded photo', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }))
    stubCanvas(undefined, false)
    await expect(canvasImageCropper.crop(new Blob(['x']), natural, rect, output, 'a.jpg')).rejects.toThrow('IMAGE_CROP_FAILED')
    vi.restoreAllMocks()
    stubCanvas(null)
    await expect(canvasImageCropper.crop(new Blob(['x']), natural, rect, output, 'a.jpg')).rejects.toThrow('IMAGE_CROP_FAILED')
    expect(close).toHaveBeenCalledTimes(2)
  })
})
