/**
 * Seal motion maths, ported from the approved CSS prototype (`seal-motion`).
 * Every function is a worklet so Skia layers can read them on the UI thread.
 */

/** Seconds a list seal plays per burst; long spins pause between bursts instead of resetting. */
export const LIST_BURST_SECONDS = 6.5;
/** Sparkle start delays are shortened in lists so the burst reads at once. */
export const LIST_DELAY_FACTOR = 0.25;
/** Below this size sparkles, glitter and particles read as noise and are skipped. */
export const SPARKLE_MIN_SIZE = 40;
/** Fixed sheen position for reduced motion: a still highlight keeps each tier recognisable. */
export const STILL_SHEEN = 0.55;

export interface LayerPhase {
  active: boolean;
  /** 0..1 inside one iteration. */
  p: number;
}

/**
 * Phase of a layer animated over `duration` seconds after `delay`.
 * Loop mode repeats forever; list mode plays one iteration per burst, as CSS `animation-iteration-count: 1`.
 */
export function layerPhase(local: number, duration: number, delay: number, loop: boolean): LayerPhase {
  "worklet";
  const t = local - delay;
  if (t < 0) return { active: false, p: 0 };
  if (loop) return { active: true, p: (t % duration) / duration };
  if (t >= duration) return { active: false, p: 1 };
  return { active: true, p: t / duration };
}

function smooth(u: number): number {
  "worklet";
  const c = Math.min(1, Math.max(0, u));
  return c * c * (3 - 2 * c);
}

/** Piecewise ease-in-out between keyframes, like a CSS animation with `ease-in-out`. */
export function keyframes(p: number, stops: readonly number[], values: readonly number[]): number {
  "worklet";
  if (p <= stops[0]!) return values[0]!;
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i]!) {
      const span = stops[i]! - stops[i - 1]!;
      const u = span <= 0 ? 1 : (p - stops[i - 1]!) / span;
      return values[i - 1]! + (values[i]! - values[i - 1]!) * smooth(u);
    }
  }
  return values[values.length - 1]!;
}

/** Breathing 0→1→0 over one iteration. */
export function wave(p: number): number {
  "worklet";
  return (1 - Math.cos(2 * Math.PI * p)) / 2;
}

/** `sway`: 0deg, -3.2deg at 25%, +3.2deg at 75%. Returns degrees. */
export function swayDegrees(p: number): number {
  "worklet";
  return -3.2 * Math.sin(2 * Math.PI * p);
}

/** `breathe`: scale 1 → 1.035 → 1. */
export function breatheScale(p: number): number {
  "worklet";
  return 1 + 0.035 * wave(p);
}

/** `pulse`: opacity .3 ↔ 1. */
export function pulseOpacity(p: number): number {
  "worklet";
  return 0.3 + 0.7 * wave(p);
}

/** `ripen`: the grapes turn purple and back. */
export function ripenOpacity(p: number): number {
  "worklet";
  return keyframes(p, [0, 0.45, 0.6, 1], [0, 0.85, 0.85, 0]);
}

/** `dew`: one drop of light. */
export function dewOpacity(p: number): number {
  "worklet";
  return keyframes(p, [0, 0.3, 0.45, 0.6, 1], [0, 0, 1, 0, 0]);
}

/** `halo`: opacity .2 → .9 → .2 and scale .94 → 1.04 → .94. */
export function haloFrame(p: number): { opacity: number; scale: number } {
  "worklet";
  const w = wave(p);
  return { opacity: 0.2 + 0.7 * w, scale: 0.94 + 0.1 * w };
}

/** `haloSpin` opacity: .55 → .95 → .55. */
export function haloSpinOpacity(p: number): number {
  "worklet";
  return 0.55 + 0.4 * wave(p);
}

export type SweepMotion = "sweep" | "sweepSnap" | "loop" | "loopEase";

/**
 * Background position of a sweeping highlight (`--sx`): 1 keeps the band off the
 * left edge, 0 off the right edge. `sweep` crosses in the first 45% and rests.
 */
export function sweepPosition(p: number, motion: SweepMotion): number {
  "worklet";
  if (motion === "loop") return 1 - p;
  if (motion === "loopEase") return 1 - smooth(p);
  const u = Math.min(1, p / 0.45);
  if (motion === "sweepSnap") return 1 - (u < 0.5 ? 8 * u ** 4 : 1 - 8 * (1 - u) ** 4);
  return 1 - smooth(u);
}

export interface SweepLine {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Gradient line of a CSS `linear-gradient(angle)` painted on an image `scale` times
 * wider than the seal and positioned at `sx` (`background-size: scale·100% 100%`).
 */
export function sweepLine(sx: number, scale: number, angle: number, left: number, top: number, size: number): SweepLine {
  "worklet";
  const imageWidth = scale * size;
  const offset = (size - imageWidth) * sx;
  const cx = left + offset + imageWidth / 2;
  const cy = top + size / 2;
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(imageWidth * Math.sin(rad)) + Math.abs(size * Math.cos(rad))) / 2;
  return { x0: cx - dx * half, y0: cy - dy * half, x1: cx + dx * half, y1: cy + dy * half };
}

/** `knife`: a glint that flashes along the blade. */
export function knifeFrame(p: number): { opacity: number; travel: number } {
  "worklet";
  return {
    opacity: keyframes(p, [0, 0.08, 0.34, 0.42, 1], [0, 1, 1, 0, 0]),
    travel: keyframes(p, [0, 0.34, 1], [-1, 1, 1]),
  };
}

/** `twinkle`: a four-point star that opens, turns and fades. */
export function twinkleFrame(p: number): { opacity: number; scale: number; rotate: number } {
  "worklet";
  return {
    opacity: keyframes(p, [0, 0.18, 0.36, 1], [0, 1, 0, 0]),
    scale: keyframes(p, [0, 0.18, 0.36, 1], [0.2, 1, 0.3, 0.2]),
    rotate: keyframes(p, [0, 0.18, 0.36, 1], [0, 45, 90, 0]),
  };
}

/** `rise`: a particle floats up and fades. */
export function riseFrame(p: number): { opacity: number; travel: number } {
  "worklet";
  const eased = 1 - (1 - Math.min(1, Math.max(0, p))) ** 2;
  return { opacity: keyframes(p, [0, 0.15, 1], [0, 1, 0]), travel: eased };
}

/** `glitter` with `steps(4)`: opacity and offsets jump four times per iteration. */
export function glitterStep(p: number): { opacity: number; shift: number } {
  "worklet";
  const step = Math.floor(Math.min(0.999, Math.max(0, p)) * 4) / 4;
  const w = 1 - Math.abs(2 * step - 1);
  return { opacity: 0.35 + 0.65 * w, shift: w };
}

/** Delay before the next list replay: every 8–16 s. */
export function nextReplayDelay(random: number = Math.random()): number {
  return 8000 + Math.min(1, Math.max(0, random)) * 8000;
}
