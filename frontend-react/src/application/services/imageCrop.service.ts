import { canvasImageCropper } from '@infrastructure/media/canvasImageCropper'
import { cropRect, croppedFileName, exportSize, type CropOffset, type ImageSize } from '@domain/media/imageCrop'

export interface ImageCropRequest {
  file: File
  /** Size of the photo as the preview shows it (EXIF orientation applied). */
  natural: ImageSize
  aspect: number
  zoom: number
  offset: CropOffset
}

export const imageCropService = {
  /** The framed part of the photo, as the JPEG that gets uploaded. */
  crop({ file, natural, aspect, zoom, offset }: ImageCropRequest): Promise<File> {
    const rect = cropRect(natural, aspect, zoom, offset)
    return canvasImageCropper.crop(file, natural, rect, exportSize(rect), croppedFileName(file.name))
  },
}
