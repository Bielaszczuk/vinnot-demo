import { describe, expect, it } from 'vitest'
import {
  MAX_CROP_ZOOM,
  MIN_CROP_ZOOM,
  clampOffset,
  clampZoom,
  croppedFileName,
  cropRect,
  displayedSize,
  exportSize,
  guideBandInset,
  imagePlacement,
  rezoom,
} from './imageCrop'
import { COVER_GUIDE_BAND_ASPECT, IMAGE_ASPECT } from './imageAspect'

const landscape = { width: 4000, height: 3000 }
const portrait = { width: 3000, height: 4000 }
const cover = IMAGE_ASPECT.COVER

describe('frames', () => {
  it('defines one frame per image kind, matching where it is shown', () => {
    expect(IMAGE_ASPECT).toEqual({ COVER: 16 / 9, AVATAR: 1, WINE: 3 / 4, LOGO: 1 })
    expect(COVER_GUIDE_BAND_ASPECT).toBe(21 / 8)
  })
})

describe('clampZoom', () => {
  it('keeps the zoom between cover fill and 4x', () => {
    expect([MIN_CROP_ZOOM, MAX_CROP_ZOOM]).toEqual([1, 4])
    expect(clampZoom(0.5)).toBe(1)
    expect(clampZoom(2.5)).toBe(2.5)
    expect(clampZoom(9)).toBe(4)
    expect(clampZoom(Number.NaN)).toBe(1)
  })
})

describe('displayedSize', () => {
  it('fills the frame at zoom 1, whichever side is shorter', () => {
    // Frame width is the unit, so a 16:9 frame is 1 x 0.5625.
    expect(displayedSize(landscape, cover, 1)).toEqual({ width: 1, height: 0.75 })
    expect(displayedSize(portrait, 1, 1)).toEqual({ width: 1, height: 4 / 3 })
    expect(displayedSize({ width: 1000, height: 100 }, 1, 1)).toEqual({ width: 10, height: 1 })
  })

  it('grows with the zoom and ignores zoom outside the limits', () => {
    expect(displayedSize(landscape, cover, 2)).toEqual({ width: 2, height: 1.5 })
    expect(displayedSize(landscape, cover, 10)).toEqual({ width: 4, height: 3 })
  })
})

describe('clampOffset', () => {
  it('never lets an edge of the photo into the frame', () => {
    expect(clampOffset(landscape, cover, 1, { x: 0.3, y: 0.5 })).toEqual({ x: 0, y: 0.09375 })
    expect(clampOffset(landscape, cover, 1, { x: -0.3, y: -0.5 })).toEqual({ x: 0, y: -0.09375 })
    expect(clampOffset(landscape, cover, 2, { x: 0.8, y: -0.1 })).toEqual({ x: 0.5, y: -0.1 })
  })

  it('treats a missing or broken offset as centred', () => {
    expect(clampOffset(landscape, cover, 1, { x: Number.NaN, y: -0 })).toEqual({ x: 0, y: 0 })
  })
})

describe('rezoom', () => {
  it('zooms around the centre of the frame and re-clamps the offset', () => {
    expect(rezoom(landscape, cover, { zoom: 2, offset: { x: 0.5, y: 0.25 } }, 4))
      .toEqual({ zoom: 4, offset: { x: 1, y: 0.5 } })
    expect(rezoom(landscape, cover, { zoom: 2, offset: { x: 0.5, y: 0.25 } }, 1))
      .toEqual({ zoom: 1, offset: { x: 0, y: 0.09375 } })
    expect(rezoom(landscape, cover, { zoom: 4, offset: { x: 0, y: 0 } }, 8))
      .toEqual({ zoom: 4, offset: { x: 0, y: 0 } })
  })
})

describe('cropRect', () => {
  it('takes the centred band of a landscape photo at zoom 1', () => {
    expect(cropRect(landscape, cover, 1, { x: 0, y: 0 })).toEqual({ x: 0, y: 375, width: 4000, height: 2250 })
  })

  it('follows the pan up to the edges of the photo', () => {
    expect(cropRect(landscape, cover, 1, { x: 0, y: 0.09375 })).toEqual({ x: 0, y: 0, width: 4000, height: 2250 })
    expect(cropRect(landscape, cover, 1, { x: 0, y: -1 })).toEqual({ x: 0, y: 750, width: 4000, height: 2250 })
  })

  it('takes a smaller part of the photo when zoomed in', () => {
    expect(cropRect(landscape, cover, 2, { x: 0, y: 0 })).toEqual({ x: 1000, y: 938, width: 2000, height: 1125 })
    expect(cropRect(landscape, cover, 2, { x: 0.5, y: 0 })).toEqual({ x: 0, y: 938, width: 2000, height: 1125 })
    expect(cropRect(landscape, cover, 2, { x: -5, y: 0 })).toEqual({ x: 2000, y: 938, width: 2000, height: 1125 })
  })

  it('crops a portrait photo to a square avatar or keeps it whole in the wine frame', () => {
    expect(cropRect(portrait, IMAGE_ASPECT.AVATAR, 1, { x: 0, y: 0 })).toEqual({ x: 0, y: 500, width: 3000, height: 3000 })
    expect(cropRect(portrait, IMAGE_ASPECT.AVATAR, 1, { x: 0, y: 1 })).toEqual({ x: 0, y: 0, width: 3000, height: 3000 })
    expect(cropRect(portrait, IMAGE_ASPECT.WINE, 1, { x: 0, y: 0 })).toEqual({ x: 0, y: 0, width: 3000, height: 4000 })
  })

  it('never reaches outside the photo at the maximum zoom', () => {
    expect(cropRect(landscape, cover, 4, { x: 9, y: 9 })).toEqual({ x: 0, y: 0, width: 1000, height: 563 })
  })
})

describe('imagePlacement', () => {
  it('places the photo in percentages of the frame', () => {
    const placement = imagePlacement(landscape, cover, 1, { x: 0, y: 0 })
    expect(placement.left).toBe(0)
    expect(placement.width).toBe(100)
    expect(placement.height).toBeCloseTo(133.333, 3)
    expect(placement.top).toBeCloseTo(-16.667, 3)
  })

  it('moves with the clamped offset', () => {
    expect(imagePlacement(landscape, cover, 2, { x: 0.5, y: 0 })).toMatchObject({ left: 0, width: 200 })
    expect(imagePlacement(landscape, cover, 2, { x: -3, y: 0 })).toMatchObject({ left: -100, width: 200 })
  })
})

describe('exportSize', () => {
  it('caps the long edge at 2400 px', () => {
    expect(exportSize({ x: 0, y: 0, width: 4000, height: 2250 })).toEqual({ width: 2400, height: 1350 })
    expect(exportSize({ x: 0, y: 0, width: 3000, height: 4000 })).toEqual({ width: 1800, height: 2400 })
  })

  it('never upscales a small crop', () => {
    expect(exportSize({ x: 10, y: 10, width: 1000, height: 750 })).toEqual({ width: 1000, height: 750 })
    expect(exportSize({ x: 0, y: 0, width: 1, height: 1 }, 2400)).toEqual({ width: 1, height: 1 })
  })
})

describe('guideBandInset', () => {
  it('measures the strip a wider display keeps, as a share of the frame height', () => {
    expect(guideBandInset(cover, COVER_GUIDE_BAND_ASPECT)).toBeCloseTo(61 / 378, 10)
    expect(guideBandInset(cover, cover)).toBe(0)
    expect(guideBandInset(cover, 1)).toBe(0)
  })
})

describe('croppedFileName', () => {
  it('keeps the picked name with a .jpg extension', () => {
    expect(croppedFileName('Atardecer en Mendoza.HEIC.png')).toBe('Atardecer en Mendoza.HEIC.jpg')
    expect(croppedFileName('photo')).toBe('photo.jpg')
    expect(croppedFileName('.png')).toBe('photo.jpg')
    expect(croppedFileName('')).toBe('photo.jpg')
  })
})
