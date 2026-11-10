export type WineLabelImageQualityFailure =
  | "LABEL_IMAGE_TOO_DARK"
  | "LABEL_IMAGE_TOO_BRIGHT"
  | "LABEL_IMAGE_OUT_OF_FOCUS"
  | "LABEL_IMAGE_RESOLUTION_TOO_LOW";

export interface WineLabelImageQuality {
  meanLuminance: number;
  edgeEnergy: number;
  width: number;
  height: number;
}

const MINIMUM_MEAN_LUMINANCE = 12;
const MAXIMUM_MEAN_LUMINANCE = 248;
const MINIMUM_EDGE_ENERGY = 1.5;
const MINIMUM_SHORT_EDGE = 320;
const MINIMUM_LONG_EDGE = 720;

export class WineLabelImageQualityError extends Error {
  constructor(
    readonly code: WineLabelImageQualityFailure,
    message: string,
  ) {
    super(message);
    this.name = "WineLabelImageQualityError";
  }
}

/**
 * Pure quality policy shared by every mobile camera adapter. Pixel decoding is
 * intentionally kept in infrastructure so the domain remains platform-free.
 */
export function measureWineLabelImageQuality(
  rgba: Uint8Array,
  width: number,
  height: number,
): WineLabelImageQuality {
  if (width <= 0 || height <= 0 || rgba.length < width * height * 4) {
    throw new Error("Invalid RGBA image data");
  }
  let luminanceSum = 0;
  let edgeSum = 0;
  let edgeCount = 0;
  for (let y = 0; y < height; y += 1) {
    let previous = -1;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const luminance =
        0.2126 * (rgba[offset] ?? 0) +
        0.7152 * (rgba[offset + 1] ?? 0) +
        0.0722 * (rgba[offset + 2] ?? 0);
      luminanceSum += luminance;
      if (previous >= 0) {
        edgeSum += Math.abs(luminance - previous);
        edgeCount += 1;
      }
      previous = luminance;
    }
  }
  return {
    meanLuminance: luminanceSum / (width * height),
    edgeEnergy: edgeCount === 0 ? 0 : edgeSum / edgeCount,
    width,
    height,
  };
}

export function assertUsableWineLabelImage(quality: WineLabelImageQuality): void {
  const shortEdge = Math.min(quality.width, quality.height);
  const longEdge = Math.max(quality.width, quality.height);
  if (shortEdge < MINIMUM_SHORT_EDGE || longEdge < MINIMUM_LONG_EDGE) {
    throw new WineLabelImageQualityError(
      "LABEL_IMAGE_RESOLUTION_TOO_LOW",
      "The wine-label image resolution is too low",
    );
  }
  if (quality.meanLuminance < MINIMUM_MEAN_LUMINANCE) {
    throw new WineLabelImageQualityError(
      "LABEL_IMAGE_TOO_DARK",
      "The wine-label image is too dark",
    );
  }
  if (quality.meanLuminance > MAXIMUM_MEAN_LUMINANCE) {
    throw new WineLabelImageQualityError(
      "LABEL_IMAGE_TOO_BRIGHT",
      "The wine-label image is overexposed",
    );
  }
  if (quality.edgeEnergy < MINIMUM_EDGE_ENERGY) {
    throw new WineLabelImageQualityError(
      "LABEL_IMAGE_OUT_OF_FOCUS",
      "The wine-label image lacks enough sharp detail",
    );
  }
}
