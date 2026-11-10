/**
 * Photo framing before upload — pure geometry, no DOM.
 *
 * The frame is measured in frame widths: a frame of aspect `a` is 1 wide and
 * 1/a tall. At zoom 1 the photo covers the frame exactly (no empty edges);
 * the user can zoom up to 4x and pan, and the offset is the shift of the
 * photo centre from the frame centre, always clamped so the photo keeps
 * covering the frame.
 */

export interface ImageSize { width: number; height: number }
export interface CropOffset { x: number; y: number }
export interface CropRect { x: number; y: number; width: number; height: number }
export interface CropView { zoom: number; offset: CropOffset }
/** Photo box inside the frame, in percentages of the frame width (left, width) and height (top, height). */
export interface ImagePlacement { left: number; top: number; width: number; height: number }

export const MIN_CROP_ZOOM = 1
export const MAX_CROP_ZOOM = 4
/** Long edge of the exported photo; larger crops are scaled down, smaller ones kept. */
export const MAX_EXPORT_EDGE = 2400

/** Clamps and turns -0 or NaN into 0, so a centred offset is always exactly 0. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value)) || 0
}

export function clampZoom(zoom: number): number {
  return Number.isFinite(zoom) ? Math.min(MAX_CROP_ZOOM, Math.max(MIN_CROP_ZOOM, zoom)) : MIN_CROP_ZOOM
}

/** Frame units per photo pixel at a zoom. */
function scaleOf(natural: ImageSize, aspect: number, zoom: number): number {
  return Math.max(1 / natural.width, 1 / aspect / natural.height) * clampZoom(zoom)
}

/** Size of the photo in frame units at a zoom. */
export function displayedSize(natural: ImageSize, aspect: number, zoom: number): ImageSize {
  const scale = scaleOf(natural, aspect, zoom)
  return { width: natural.width * scale, height: natural.height * scale }
}

export function clampOffset(natural: ImageSize, aspect: number, zoom: number, offset: CropOffset): CropOffset {
  const size = displayedSize(natural, aspect, zoom)
  const maxX = Math.max(0, (size.width - 1) / 2)
  const maxY = Math.max(0, (size.height - 1 / aspect) / 2)
  return { x: clamp(offset.x, -maxX, maxX), y: clamp(offset.y, -maxY, maxY) }
}

/** Changes the zoom around the frame centre: the point in the middle stays in the middle. */
export function rezoom(natural: ImageSize, aspect: number, view: CropView, zoom: number): CropView {
  const next = clampZoom(zoom)
  const ratio = next / clampZoom(view.zoom)
  return { zoom: next, offset: clampOffset(natural, aspect, next, { x: view.offset.x * ratio, y: view.offset.y * ratio }) }
}

/** Part of the photo inside the frame, in whole photo pixels, never outside the photo. */
export function cropRect(natural: ImageSize, aspect: number, zoom: number, offset: CropOffset): CropRect {
  const scale = scaleOf(natural, aspect, zoom)
  const clamped = clampOffset(natural, aspect, zoom, offset)
  const width = Math.min(natural.width, Math.round(1 / scale))
  const height = Math.min(natural.height, Math.round(1 / aspect / scale))
  const x = Math.round(natural.width / 2 - clamped.x / scale - width / 2)
  const y = Math.round(natural.height / 2 - clamped.y / scale - height / 2)
  return { x: clamp(x, 0, natural.width - width), y: clamp(y, 0, natural.height - height), width, height }
}

/** Where to draw the photo inside the frame for a view. */
export function imagePlacement(natural: ImageSize, aspect: number, zoom: number, offset: CropOffset): ImagePlacement {
  const size = displayedSize(natural, aspect, zoom)
  const clamped = clampOffset(natural, aspect, zoom, offset)
  const frameHeight = 1 / aspect
  return {
    left: (0.5 + clamped.x - size.width / 2) * 100,
    top: ((frameHeight / 2 + clamped.y - size.height / 2) / frameHeight) * 100,
    width: size.width * 100,
    height: (size.height / frameHeight) * 100,
  }
}

/** Output size of the exported photo: long edge capped, never upscaled. */
export function exportSize(rect: CropRect, maxEdge = MAX_EXPORT_EDGE): ImageSize {
  const factor = Math.min(1, maxEdge / Math.max(rect.width, rect.height))
  return { width: Math.max(1, Math.round(rect.width * factor)), height: Math.max(1, Math.round(rect.height * factor)) }
}

/**
 * Share of the frame height cut above (and below) by a wider display of the
 * same photo, centred like `object-cover`; 0 when the display is not wider.
 */
export function guideBandInset(frameAspect: number, bandAspect: number): number {
  return Math.max(0, (1 - frameAspect / bandAspect) / 2)
}

/** The exported photo keeps the picked name, as a JPEG. */
export function croppedFileName(name: string): string {
  const base = name.replace(/\.[^./\\]*$/, '').trim()
  return `${base || 'photo'}.jpg`
}
