import type { DimensionValue, ViewStyle } from "react-native";
import type { NormalizedImageRegion } from "@/shared/image/imageGeometry";

export const WINE_LABEL_CAPTURE_REGION: NormalizedImageRegion = Object.freeze({
  originX: 0.06,
  originY: 0.1,
  width: 0.88,
  height: 0.8,
});

export function toCaptureFrameStyle(
  region: NormalizedImageRegion,
): Pick<ViewStyle, "left" | "top" | "width" | "height"> {
  return {
    left: percentage(region.originX),
    top: percentage(region.originY),
    width: percentage(region.width),
    height: percentage(region.height),
  };
}

export function captureHintTop(region: NormalizedImageRegion): DimensionValue {
  return percentage(region.originY + region.height);
}

function percentage(value: number): DimensionValue {
  return `${value * 100}%`;
}
