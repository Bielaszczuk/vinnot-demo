/**
 * Frames an uploaded photo is adjusted to, one per place it is shown, so what the user frames
 * is what the app displays.
 * @architecture: Capa 1 — Dominio
 */
import type { ImageSize } from "./imageCrop";

export type ImageFrameKind = "COVER" | "AVATAR" | "WINE" | "LOGO";

export interface ImageFrame {
  /** Width divided by height. */
  aspect: number;
  /** Shown through a round mask (profile photos). */
  round: boolean;
  /** Aspect of the widest place that shows only the middle strip of the photo, if any. */
  guideAspect: number | null;
  /** Longest edge of the exported photo; smaller photos are never upscaled. */
  maxLongEdge: number;
  /** A PNG stays PNG so its transparency survives (catalog logos and bottle cut-outs). */
  keepsTransparency: boolean;
}

/** Event and wine route covers: cards and detail heroes. */
export const COVER_ASPECT = 16 / 9;
/** The web detail hero shows a 21:8 strip of a cover. */
const COVER_HERO_ASPECT = 21 / 8;

export const IMAGE_FRAMES: Readonly<Record<ImageFrameKind, ImageFrame>> = {
  COVER: { aspect: COVER_ASPECT, round: false, guideAspect: COVER_HERO_ASPECT, maxLongEdge: 2400, keepsTransparency: false },
  AVATAR: { aspect: 1, round: true, guideAspect: null, maxLongEdge: 1200, keepsTransparency: false },
  WINE: { aspect: 3 / 4, round: false, guideAspect: null, maxLongEdge: 2400, keepsTransparency: true },
  LOGO: { aspect: 1, round: false, guideAspect: null, maxLongEdge: 1200, keepsTransparency: true },
};

/** The largest frame of the given aspect that fits the available space. */
export function fitFrame(available: ImageSize, aspect: number): ImageSize {
  if (available.width <= 0 || available.height <= 0) return { width: 0, height: 0 };
  const width = Math.min(available.width, available.height * aspect);
  return { width, height: width / aspect };
}

/** The middle strip of a frame that the widest display always shows, or null without one. */
export function guideBand(frame: ImageSize, guideAspect: number | null): { top: number; height: number } | null {
  if (guideAspect === null) return null;
  const height = frame.width / guideAspect;
  if (height >= frame.height) return null;
  return { top: (frame.height - height) / 2, height };
}
