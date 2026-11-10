/**
 * Crop geometry for adjusting a photo inside a frame. The photo always covers the frame: zoom 1
 * fills it exactly and zoom 4 is the closest view. The offset is how far the photo's centre sits
 * from the frame's centre, in frame points. The functions also run on the UI thread during a
 * gesture, hence the "worklet" directives (plain strings outside Reanimated).
 * @architecture: Capa 1 — Dominio
 */

export const MIN_CROP_ZOOM = 1;
export const MAX_CROP_ZOOM = 4;

export interface ImageSize {
  width: number;
  height: number;
}

export interface CropOffset {
  x: number;
  y: number;
}

/** Region of the photo to keep, in its own pixels. */
export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/** A picked photo waiting to be adjusted; width and height already follow its orientation. */
export interface PickedPhoto extends ImageSize {
  uri: string;
}

export function clampCropZoom(zoom: number): number {
  "worklet";
  if (Number.isNaN(zoom)) return MIN_CROP_ZOOM;
  return Math.min(MAX_CROP_ZOOM, Math.max(MIN_CROP_ZOOM, zoom));
}

/** Scale that makes the photo just cover the frame (zoom 1). */
export function coverScale(image: ImageSize, frame: ImageSize): number {
  "worklet";
  return Math.max(frame.width / image.width, frame.height / image.height);
}

/** How far the photo can move each way before an edge would enter the frame. */
export function maxCropOffset(image: ImageSize, frame: ImageSize, zoom: number): CropOffset {
  "worklet";
  const scale = coverScale(image, frame) * clampCropZoom(zoom);
  return {
    x: Math.max(0, (image.width * scale - frame.width) / 2),
    y: Math.max(0, (image.height * scale - frame.height) / 2),
  };
}

export function clampCropOffset(image: ImageSize, frame: ImageSize, zoom: number, offset: CropOffset): CropOffset {
  "worklet";
  const max = maxCropOffset(image, frame, zoom);
  return {
    x: Math.min(max.x, Math.max(-max.x, offset.x)),
    y: Math.min(max.y, Math.max(-max.y, offset.y)),
  };
}

/** The part of the photo the frame shows, in whole photo pixels and always inside the photo. */
export function cropRect(image: ImageSize, frame: ImageSize, zoom: number, offset: CropOffset): CropRect {
  if (!(image.width > 0 && image.height > 0 && frame.width > 0 && frame.height > 0)) {
    throw new RangeError("INVALID_CROP_SIZE");
  }
  const clampedZoom = clampCropZoom(zoom);
  const scale = coverScale(image, frame) * clampedZoom;
  const { x, y } = clampCropOffset(image, frame, clampedZoom, offset);
  const width = Math.max(1, Math.min(image.width, Math.round(frame.width / scale)));
  const height = Math.max(1, Math.min(image.height, Math.round(frame.height / scale)));
  // Distance from the photo's left/top edge to the frame's, in frame points.
  const left = (image.width * scale - frame.width) / 2 - x;
  const top = (image.height * scale - frame.height) / 2 - y;
  return {
    originX: Math.min(image.width - width, Math.max(0, Math.round(left / scale))),
    originY: Math.min(image.height - height, Math.max(0, Math.round(top / scale))),
    width,
    height,
  };
}
