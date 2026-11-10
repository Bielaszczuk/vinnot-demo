export interface ImageDimensions {
  width: number;
  height: number;
}

export interface NormalizedImageRegion {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface ImageCropRectangle extends ImageDimensions {
  originX: number;
  originY: number;
}

export type ImageResize = Readonly<
  { width: number; height?: never } | { width?: never; height: number }
>;

export function calculateImageCrop(
  source: ImageDimensions,
  region: NormalizedImageRegion,
): ImageCropRectangle {
  assertPositiveDimension(source.width, "Image width");
  assertPositiveDimension(source.height, "Image height");
  assertNormalizedRegion(region);

  const originX = Math.floor(source.width * region.originX);
  const originY = Math.floor(source.height * region.originY);
  const endX = Math.ceil(source.width * (region.originX + region.width));
  const endY = Math.ceil(source.height * (region.originY + region.height));

  return {
    originX,
    originY,
    width: Math.max(1, Math.min(source.width, endX) - originX),
    height: Math.max(1, Math.min(source.height, endY) - originY),
  };
}

/**
 * Maps a guide drawn over an aspect-fill preview back to source-image pixels.
 * Camera previews commonly crop the source at the edges, so multiplying both
 * axes by the same normalized values would not select the visible rectangle.
 */
export function calculateAspectFillImageCrop(
  source: ImageDimensions,
  viewport: ImageDimensions,
  region: NormalizedImageRegion,
): ImageCropRectangle {
  assertPositiveDimension(source.width, "Image width");
  assertPositiveDimension(source.height, "Image height");
  assertPositiveDimension(viewport.width, "Viewport width");
  assertPositiveDimension(viewport.height, "Viewport height");
  assertNormalizedRegion(region);

  const scale = Math.max(
    viewport.width / source.width,
    viewport.height / source.height,
  );
  const horizontalOverflow = (source.width * scale - viewport.width) / 2;
  const verticalOverflow = (source.height * scale - viewport.height) / 2;
  const originX = Math.floor(
    (horizontalOverflow + region.originX * viewport.width) / scale,
  );
  const originY = Math.floor(
    (verticalOverflow + region.originY * viewport.height) / scale,
  );
  const endX = Math.ceil(
    (horizontalOverflow + (region.originX + region.width) * viewport.width) /
      scale,
  );
  const endY = Math.ceil(
    (verticalOverflow + (region.originY + region.height) * viewport.height) /
      scale,
  );

  return boundedCrop(source, originX, originY, endX, endY);
}

export function calculateConstrainedResize(
  source: ImageDimensions,
  maximumLongEdge: number,
): ImageResize | null {
  assertPositiveDimension(source.width, "Image width");
  assertPositiveDimension(source.height, "Image height");
  assertPositiveDimension(maximumLongEdge, "Maximum long edge");

  if (Math.max(source.width, source.height) <= maximumLongEdge) {
    return null;
  }
  return source.width >= source.height ? { width: maximumLongEdge } : { height: maximumLongEdge };
}

function assertNormalizedRegion(region: NormalizedImageRegion) {
  const values = [region.originX, region.originY, region.width, region.height];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("Normalized image region must contain finite values");
  }
  if (
    region.originX < 0 ||
    region.originY < 0 ||
    region.width <= 0 ||
    region.height <= 0 ||
    region.originX + region.width > 1 ||
    region.originY + region.height > 1
  ) {
    throw new Error("Normalized image region must fit inside its source");
  }
}

function boundedCrop(
  source: ImageDimensions,
  rawOriginX: number,
  rawOriginY: number,
  rawEndX: number,
  rawEndY: number,
): ImageCropRectangle {
  const originX = Math.max(0, Math.min(source.width - 1, rawOriginX));
  const originY = Math.max(0, Math.min(source.height - 1, rawOriginY));
  const endX = Math.max(originX + 1, Math.min(source.width, rawEndX));
  const endY = Math.max(originY + 1, Math.min(source.height, rawEndY));
  return {
    originX,
    originY,
    width: endX - originX,
    height: endY - originY,
  };
}

function assertPositiveDimension(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
}
