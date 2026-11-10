import { expect, it } from 'vitest'
import { MAX_CATALOG_IMAGE_BYTES, acceptsCatalogImage } from './catalogImages'

it('accepts JPEG, PNG, GIF and WebP photos up to 5 MB', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
    expect(acceptsCatalogImage(type, 1024)).toBe(true)
  }
  expect(acceptsCatalogImage('image/png', MAX_CATALOG_IMAGE_BYTES)).toBe(true)
})

it('rejects other formats, empty files and files over 5 MB', () => {
  expect(acceptsCatalogImage('image/svg+xml', 1024)).toBe(false)
  expect(acceptsCatalogImage('application/pdf', 1024)).toBe(false)
  expect(acceptsCatalogImage('image/jpeg', 0)).toBe(false)
  expect(acceptsCatalogImage('image/jpeg', MAX_CATALOG_IMAGE_BYTES + 1)).toBe(false)
})
