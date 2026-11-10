/**
 * Canvas export of a framed photo — the browser adapter behind the crop step.
 *
 * Decodes the picked file with its EXIF orientation applied (the same way the
 * preview `<img>` shows it), draws the chosen rectangle at the output size on
 * a white background (transparent areas would otherwise turn black) and
 * encodes a JPEG.
 */

export interface PixelSize { width: number; height: number }
export interface PixelRect extends PixelSize { x: number; y: number }

export const CROP_JPEG_QUALITY = 0.9

interface DecodedImage extends PixelSize {
  source: CanvasImageSource
  release: () => void
}

async function decode(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
  }
  const url = URL.createObjectURL(file)
  const release = () => URL.revokeObjectURL(url)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release }
  } catch (failure) {
    release()
    throw failure
  }
}

function encode(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', CROP_JPEG_QUALITY))
}

export const canvasImageCropper = {
  /**
   * `rect` is in the pixels of `natural`, the size the preview reported; it is
   * scaled if the decoder sees a different size.
   */
  async crop(file: Blob, natural: PixelSize, rect: PixelRect, output: PixelSize, name: string): Promise<File> {
    const image = await decode(file)
    try {
      const scaleX = image.width / natural.width
      const scaleY = image.height / natural.height
      const canvas = document.createElement('canvas')
      canvas.width = output.width
      canvas.height = output.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('IMAGE_CROP_FAILED')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, output.width, output.height)
      context.imageSmoothingQuality = 'high'
      context.drawImage(
        image.source,
        rect.x * scaleX, rect.y * scaleY, rect.width * scaleX, rect.height * scaleY,
        0, 0, output.width, output.height,
      )
      const blob = await encode(canvas)
      if (!blob) throw new Error('IMAGE_CROP_FAILED')
      return new File([blob], name, { type: 'image/jpeg' })
    } finally {
      image.release()
    }
  },
}
