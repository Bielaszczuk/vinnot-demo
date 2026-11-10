/**
 * What each seal does, escalating by tier (S7), taken from the approved prototype CSS (`.t-<slug>`).
 * Coordinates are fractions of the seal box; durations are seconds.
 */
import type { BadgeTier } from "@/domain/points/badgeTiers";
import type { SweepMotion } from "./sealMotion";

export type SealBlend = "screen" | "overlay" | "softLight" | "color";

export interface SweepSpec {
  kind: "sweep";
  angle: number;
  /** Background width as a multiple of the seal (300% → 3). */
  scale: number;
  colors: string[];
  positions: number[];
  blend: SealBlend;
  duration: number;
  motion: SweepMotion;
  /** Layer opacity. */
  opacity: number;
  /** Vinnot: the band angle follows the finger. */
  followPointer?: boolean;
}

export interface GlowSpec {
  kind: "glow";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  colors: string[];
  positions: number[];
  blend: SealBlend;
  duration: number;
  keyframe: "pulse" | "dew" | "ripen";
  /** Opacity when the animation is not running (CSS base value). */
  rest: number;
}

export interface HaloSpec {
  /** Extra size around the seal (inset -16% → 0.16). */
  inset: number;
  colors: string[];
  positions: number[];
  duration: number;
  /** Vinnot: a rainbow ring that turns. */
  rainbow?: boolean;
}

export interface HoloSpec {
  cx: number;
  cy: number;
  colors: string[];
  opacity: number;
  blend: SealBlend;
  /** One turn every `duration` seconds. */
  duration: number;
  followPointer?: boolean;
}

/** [x %, y %, size % of the sparkle box, delay s]. */
export type SparkSpec = readonly [number, number, number, number];

export interface SealEffect {
  sway?: number;
  breathe?: number;
  halo?: HaloSpec;
  rays?: { duration: number };
  holo?: HoloSpec;
  tint?: SweepSpec | GlowSpec;
  sheen?: SweepSpec | GlowSpec;
  knife?: { duration: number };
  glitter?: { duration: number };
  sparks?: { items: readonly SparkSpec[]; colors: readonly string[]; durations: (index: number) => number };
  particles?: boolean;
}

export const HOLO_COLORS = ["#ff7ad1", "#ffd27a", "#8affc1", "#79d3ff", "#b78bff"] as const;

const band = (angle: number, colors: string[], positions: number[], blend: SealBlend, duration: number, motion: SweepMotion, scale = 3): SweepSpec => ({
  kind: "sweep", angle, scale, colors, positions, blend, duration, motion, opacity: 1,
});

const T = "rgba(255,255,255,0)";
const twinkle = (index: number) => 2.4 + (index % 3) * 0.5;

export const SEAL_EFFECTS: Record<BadgeTier, SealEffect> = {
  BROTE: { sway: 4.2 },
  PARRA: {
    sway: 4.6,
    breathe: 4.6,
    sheen: { kind: "glow", cx: 0.4, cy: 0.3, rx: 0.6, ry: 0.5, colors: ["rgba(220,255,190,0.35)", "rgba(220,255,190,0)"], positions: [0, 0.7], blend: "screen", duration: 4.6, keyframe: "pulse", rest: 1 },
  },
  RACIMO: {
    breathe: 5,
    tint: { kind: "glow", cx: 0.42, cy: 0.6, rx: 0.3, ry: 0.32, colors: ["#6f2a8a", "rgba(111,42,138,0)"], positions: [0, 1], blend: "color", duration: 5, keyframe: "ripen", rest: 0 },
    sheen: { kind: "glow", cx: 0.36, cy: 0.52, rx: 0.1, ry: 0.09, colors: ["rgba(255,255,255,0.95)", T], positions: [0, 1], blend: "screen", duration: 5, keyframe: "dew", rest: 0 },
  },
  VENDIMIA: {
    knife: { duration: 3.8 },
    sparks: { items: [[70, 32, 16, 0.9]], colors: ["#fff8e0"], durations: () => 3.8 },
  },
  LAGAR: {
    breathe: 6.5,
    sheen: band(110, [T, "rgba(255,236,210,0.55)", T], [0.4, 0.5, 0.6], "softLight", 6.5, "sweep"),
  },
  BARRICA: {
    sheen: band(105, [T, "rgba(255,255,255,0.2)", "rgba(255,255,255,0.95)", "rgba(255,255,255,0.2)", T], [0.36, 0.44, 0.5, 0.56, 0.64], "overlay", 4.2, "sweepSnap"),
  },
  CRIANZA: {
    halo: { inset: 0.16, colors: ["rgba(170,40,70,0.75)", "rgba(170,40,70,0.25)", "rgba(170,40,70,0)"], positions: [0, 0.55, 1], duration: 4.8 },
    sheen: band(115, [T, "rgba(255,230,235,0.75)", T], [0.38, 0.5, 0.62], "overlay", 4.8, "sweep"),
  },
  RESERVA: {
    halo: { inset: 0.18, colors: ["rgba(255,196,90,0.8)", "rgba(255,170,60,0.25)", "rgba(255,170,60,0)"], positions: [0, 0.55, 1], duration: 4.4 },
    sheen: band(112, [T, "rgba(255,240,190,0.2)", "rgba(255,248,215,1)", "rgba(255,240,190,0.2)", T], [0.38, 0.45, 0.5, 0.55, 0.62], "overlay", 4.4, "sweepSnap"),
  },
  GRAN_RESERVA: {
    rays: { duration: 26 },
    halo: { inset: 0.14, colors: ["rgba(255,200,95,0.7)", "rgba(255,200,95,0)"], positions: [0, 1], duration: 3.6 },
    sheen: band(112, [T, "rgba(255,246,205,0.95)", "rgba(255,255,240,1)", "rgba(255,246,205,0.95)", T], [0.3, 0.46, 0.5, 0.54, 0.7], "overlay", 2.8, "loop", 2.6),
    holo: { cx: 0.5, cy: 0.5, colors: ["#fff2c4", "#c88a2c", "#fff6d8", "#a5701f", "#fff2c4"], opacity: 0.35, blend: "softLight", duration: 8 },
    sparks: { items: [[22, 26, 15, 0], [80, 30, 12, 1.1], [70, 80, 14, 1.9]], colors: ["#ffe39a"], durations: twinkle },
  },
  GRAN_ENOFILO: {
    holo: {
      cx: 0.5, cy: 0.45,
      colors: ["#ffffff", "#5d6a78", "#f4f8ff", "#3a4450", "#ffffff", "#7d8b9b", "#eef3fa", "#48525e", "#ffffff"],
      opacity: 0.85, blend: "overlay", duration: 6,
    },
    sheen: band(100, [T, "rgba(220,240,255,0.95)", T], [0.42, 0.5, 0.58], "screen", 3.4, "sweepSnap"),
    halo: { inset: 0.14, colors: ["rgba(170,215,255,0.55)", "rgba(170,215,255,0)"], positions: [0, 1], duration: 3.4 },
    sparks: { items: [[24, 22, 14, 0], [82, 26, 12, 0.7], [78, 78, 15, 1.4], [20, 74, 11, 2.1], [52, 10, 10, 1.7]], colors: ["#d8ecff"], durations: twinkle },
  },
  VINNOT: {
    holo: { cx: 0.5, cy: 0.4, colors: [...HOLO_COLORS, HOLO_COLORS[0]], opacity: 0.8, blend: "overlay", duration: 7, followPointer: true },
    tint: { ...band(115, [...HOLO_COLORS], [0, 0.25, 0.5, 0.75, 1], "color", 5.5, "loop", 2.2), opacity: 0.32, followPointer: true },
    sheen: { ...band(115, [T, T, "rgba(255,255,255,0.85)", T, T], [0.34, 0.4, 0.5, 0.6, 0.66], "overlay", 3.2, "loopEase", 2.6), followPointer: true },
    glitter: { duration: 1.6 },
    halo: { inset: 0.18, colors: HOLO_COLORS.map((color) => color), positions: [0, 0.25, 0.5, 0.75, 1], duration: 7, rainbow: true },
    sparks: { items: [[18, 22, 15, 0], [84, 24, 13, 0.6], [86, 72, 14, 1.3], [16, 70, 12, 1.9], [50, 6, 11, 1.1], [62, 92, 10, 2.4]], colors: HOLO_COLORS, durations: twinkle },
    particles: true,
  },
};

/** Room the canvas needs around the seal for halos, rays and sparkles. */
export function sealBleed(effect: SealEffect): number {
  if (effect.rays) return 0.36;
  if (effect.halo || effect.sparks) return Math.max(effect.halo?.inset ?? 0, 0.16);
  return 0.08;
}
