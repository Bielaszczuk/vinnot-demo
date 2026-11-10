import { http } from '@infrastructure/http/http'

/** Formats `/admin/catalog-images` stores as they are; anything else is re-encoded first. */
const STORED_TYPES = ['image/jpeg', 'image/png']
const JPEG_QUALITY = 0.92

export const catalogImagesClient = {
  /** Sends the photo as a data URL and returns the public URL of the stored image. */
  async upload(file: File, signal: AbortSignal): Promise<string> {
    const dataUrl = STORED_TYPES.includes(file.type) ? await readAsDataUrl(file) : await reencodeAsJpeg(file)
    const response = await http.post<{ imageUrl: string }>('/admin/catalog-images', { dataUrl }, { signal })
    return response.data.imageUrl
  },
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('CATALOG_IMAGE_READ')))
    reader.onerror = () => reject(new Error('CATALOG_IMAGE_READ'))
    reader.readAsDataURL(file)
  })
}

/** GIF and WebP become a JPEG on a white background (transparent areas would otherwise turn black). */
async function reencodeAsJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('CATALOG_IMAGE_READ')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, bitmap.width, bitmap.height)
    context.drawImage(bitmap, 0, 0)
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } finally {
    bitmap.close()
  }
}
