import { toByteArray } from "base64-js";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode } from "jpeg-js";
import {
  measureWineLabelImageQuality,
  type WineLabelImageQuality,
} from "@/shared/image/wineLabelImageQuality";
import type { CapturedCameraImage } from "./wineLabelImageProcessor";
import { ownWineLabelImage, releaseWineLabelImage } from "./wineLabelTemporaryImages";

const QUALITY_SAMPLE_WIDTH = 192;

/** Decodes only a small derivative; the full camera frame never crosses JS. */
export async function analyzeWineLabelImageQuality(
  image: CapturedCameraImage,
): Promise<WineLabelImageQuality> {
  const rendered = await ImageManipulator.manipulate(image.uri)
    .resize({ width: QUALITY_SAMPLE_WIDTH })
    .renderAsync();
  const sample = await rendered.saveAsync({
    base64: true,
    compress: 0.75,
    format: SaveFormat.JPEG,
  });
  ownWineLabelImage(sample.uri);
  try {
    if (!sample.base64) {
      throw new Error("Could not generate image-quality sample");
    }
    const decoded = decode(toByteArray(sample.base64), { useTArray: true });
    const measured = measureWineLabelImageQuality(decoded.data, decoded.width, decoded.height);
    return {
      ...measured,
      width: image.width,
      height: image.height,
    };
  } finally {
    releaseWineLabelImage(sample.uri);
  }
}
