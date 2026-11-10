import { ImageManipulator, SaveFormat, type ImageResult } from "expo-image-manipulator";
import {
  calculateAspectFillImageCrop,
  calculateConstrainedResize,
  calculateImageCrop,
  type ImageDimensions,
  type NormalizedImageRegion,
} from "@/shared/image/imageGeometry";

const MAXIMUM_LABEL_LONG_EDGE = 1600;
const LABEL_JPEG_QUALITY = 0.9;

export interface CapturedCameraImage extends ImageDimensions {
  uri: string;
}

export async function prepareWineLabelImage(
  image: CapturedCameraImage,
  captureRegion: NormalizedImageRegion,
  previewDimensions?: ImageDimensions,
): Promise<ImageResult> {
  const crop = previewDimensions
    ? calculateAspectFillImageCrop(image, previewDimensions, captureRegion)
    : calculateImageCrop(image, captureRegion);
  const resize = calculateConstrainedResize(crop, MAXIMUM_LABEL_LONG_EDGE);
  const context = ImageManipulator.manipulate(image.uri).crop(crop);
  if (resize) {
    context.resize(resize);
  }

  const renderedImage = await context.renderAsync();
  return renderedImage.saveAsync({
    base64: false,
    compress: LABEL_JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
}
