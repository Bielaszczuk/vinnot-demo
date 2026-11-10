import { catalogImagesClient } from '@infrastructure/api/clients/catalogImages.client'
import { acceptsCatalogImage } from '@domain/media/catalogImages'

/** Wine photos for the catalog, uploaded as soon as staff pick them. */
export const catalogImagesService = {
  async upload(file: File, signal: AbortSignal): Promise<string> {
    if (!acceptsCatalogImage(file.type, file.size)) throw new Error('INVALID_CATALOG_IMAGE')
    return catalogImagesClient.upload(file, signal)
  },
}
