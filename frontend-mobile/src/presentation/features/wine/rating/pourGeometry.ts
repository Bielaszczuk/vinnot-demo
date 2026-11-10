/**
 * Geometry of the pour control, ported from the approved prototype
 * (`buildPour` / `paintPour`). Every function runs on the UI thread too.
 */
import { wineTop, type BottleArt, type GlassArt, type WineBox } from "./ratingArt";

/** Bottle angle while the score rises (pouring) and while it rests or falls (lifted). */
export const POUR_ANGLE = 118;
export const REST_ANGLE = 62;

/**
 * Where the bottle mouth pours, as a fraction of the glass width: just inside the left end
 * of the rim (the rim of every glass art spans about 0.15–0.85 of its width).
 */
export const RIM_ENTRY = 0.21;
/** Height of the bottle mouth, as a fraction of the glass height: just above the rim. */
const LIP_LEVEL = -0.02;
/** Share of each glass's score spent moving the bottle over from the previous glass. */
const GLASS_HOP = 0.08;
/** Bottle height, in glass heights. */
const BOTTLE_SCALE = 1.3;
/** Room left of the standing bottle and between it and the first glass, in glass heights. */
const STAND_PAD = 0.2;
const STAND_GAP = 0.45;
/** Distance between glasses, in glass heights: compact by default, spread up to this when there is room. */
const MIN_SLOT = 0.8;
const MAX_SLOT = 1.2;

export interface PourLayout {
  width: number;
  height: number;
  /** Margin before the rail: the stand where the bottle waits upright. */
  side: number;
  /** Rail length: from 0 to 5. */
  inner: number;
  slot: number;
  glassWidth: number;
  glassHeight: number;
  /** Top of the glasses. */
  top: number;
  bottleWidth: number;
  bottleHeight: number;
  /** Centre of the upright bottle on its stand. */
  standX: number;
  standY: number;
}

/** Glass heights per control size: close to the glass row it replaced, a little bigger. */
export const POUR_GLASS_HEIGHT = { md: 46, lg: 56 } as const;
export type PourSize = keyof typeof POUR_GLASS_HEIGHT;

/**
 * Layout of the control. Without `available` the glasses sit in a compact row; with it they
 * spread over that width, so the control fills its card.
 */
export function pourLayout(glassHeight: number, glass: GlassArt, bottle: BottleArt, available?: number): PourLayout {
  "worklet";
  const bottleHeight = glassHeight * BOTTLE_SCALE;
  const bottleWidth = (bottleHeight * bottle.width) / bottle.height;
  const side = glassHeight * (STAND_PAD + STAND_GAP) + bottleWidth;
  const fit = available ? (available - side) / 5 : 0;
  const slot = Math.min(glassHeight * MAX_SLOT, Math.max(glassHeight * MIN_SLOT, fit));
  const inner = slot * 5;
  // Room above the rims for the tilted bottle, whose mouth rests just above a rim.
  const top = glassHeight * 0.9;
  return {
    width: Math.floor(side + inner),
    // Below the glasses: room for the standing bottle's shadow.
    height: Math.round(top + glassHeight + 8),
    side,
    inner,
    slot,
    glassWidth: (glassHeight * glass.width) / glass.height,
    glassHeight,
    top,
    bottleWidth,
    bottleHeight,
    standX: glassHeight * STAND_PAD + bottleWidth / 2,
    // Upright on the same base line as the glasses.
    standY: top + glassHeight - bottleHeight / 2,
  };
}

export type BottleStage = "corked" | "pouring" | "finished";

/** Not rated yet: corked on its stand. Rated: pouring. 5.0: back on its stand, open and empty. */
export function bottleStage(value: number): BottleStage {
  "worklet";
  if (value <= 0) return "corked";
  return value >= 5 ? "finished" : "pouring";
}

/** The cork in the bottle's own frame (origin at the bottle centre, upright), centred in its mouth. */
export function corkBox(layout: PourLayout, bottle: BottleArt) {
  "worklet";
  const { cork } = bottle;
  const width = layout.bottleWidth * cork.size;
  const height = (width * cork.height) / cork.width;
  const lipX = (bottle.lip[0] / bottle.width - 0.5) * layout.bottleWidth;
  const lipY = (bottle.lip[1] / bottle.height - 0.5) * layout.bottleHeight;
  return { x: lipX - width / 2, y: lipY - height * (1 - cork.inNeck), width, height };
}

/** Left edge of glass `index` (0..4). */
export function glassLeft(index: number, layout: PourLayout): number {
  "worklet";
  return layout.side + index * layout.slot + (layout.slot - layout.glassWidth) / 2;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where the wine shows in a glass drawn at `left`/`top` and `width` × `height`, filled by `fill`
 * (0..1): the wine is the art uncovered from `wine.y` down, and `surface` a thin band at its top.
 */
export function wineBoxes(left: number, top: number, width: number, height: number, box: WineBox, fill: number) {
  "worklet";
  const y = top + wineTop(box, fill) * height;
  return {
    wine: { x: left, y, width, height: Math.max(0, top + height - y) } satisfies Box,
    surface: { x: left, y, width, height: fill > 0 ? height * 0.014 : 0 } satisfies Box,
  };
}

/** Raw (unsnapped) rating under a horizontal position. */
export function ratingFromX(x: number, layout: PourLayout): number {
  "worklet";
  return ((x - layout.side) / layout.inner) * 5;
}

export interface PourFrame {
  /** Bottle mouth while pouring: just above the left rim of the glass being filled. */
  lipX: number;
  lipY: number;
  /** 0 while the bottle moves over from the previous glass, 1 once it is over this one. */
  ready: number;
  /** Where the stream lands: the wine surface of the glass being filled, near the wall it runs down. */
  targetX: number;
  targetY: number;
  bottleCenterX: number;
  bottleCenterY: number;
  /** Control point of the curved stream. */
  controlX: number;
  controlY: number;
}

export function pourFrame(value: number, layout: PourLayout, glass: GlassArt, bottle: BottleArt): PourFrame {
  "worklet";
  const index = Math.min(4, Math.max(0, Math.floor(value - 1e-6)));
  const fill = Math.min(1, Math.max(0, value - index));
  const entry = glassLeft(index, layout) + RIM_ENTRY * layout.glassWidth;
  // Real pouring: the bottle sits over one glass, and is carried to the next one when it is full.
  // The first glass needs no carry: the bottle is lifted straight over it from its stand.
  const from = index === 0 ? entry : glassLeft(index - 1, layout) + RIM_ENTRY * layout.glassWidth;
  const hop = index === 0 ? 1 : Math.min(1, fill / GLASS_HOP);
  const ready = hop * hop * (3 - 2 * hop);
  const lipX = from + (entry - from) * ready;
  const lipY = layout.top + LIP_LEVEL * layout.glassHeight;
  // The wine runs down the near side of the bowl, which narrows towards the bottom, so the
  // stream lands closer to the centre the lower the wine is.
  const [boxX, , boxW] = glass.box;
  const centre = boxX + boxW / 2;
  const reach = 0.75 - 0.65 * fill;
  const targetX = glassLeft(index, layout) + (RIM_ENTRY + (centre - RIM_ENTRY) * reach) * layout.glassWidth;
  const targetY = layout.top + wineTop(glass.box, fill) * layout.glassHeight;
  const angle = (POUR_ANGLE * Math.PI) / 180;
  const ox = (bottle.lip[0] / bottle.width - 0.5) * layout.bottleWidth;
  const oy = (bottle.lip[1] / bottle.height - 0.5) * layout.bottleHeight;
  return {
    lipX,
    lipY,
    ready,
    targetX,
    targetY,
    bottleCenterX: lipX - (ox * Math.cos(angle) - oy * Math.sin(angle)),
    bottleCenterY: lipY - (ox * Math.sin(angle) + oy * Math.cos(angle)),
    // Falls almost straight in past the rim, then follows the wall towards the wine.
    controlX: lipX + (targetX - lipX) * 0.25,
    controlY: lipY + (targetY - lipY) * 0.7,
  };
}

/**
 * Height of the wine surface on the canvas. The surface stays level whatever the bottle's angle:
 * it rises from the lowest point of the wine space (the base upright, the neck once turned past
 * horizontal) by the share of wine left, `remaining` (1 full, 0 empty).
 */
export function wineSurfaceY(
  centerX: number, centerY: number, angle: number, remaining: number, layout: PourLayout, bottle: BottleArt,
): number {
  "worklet";
  const [top, bottom] = bottle.wine;
  const a = (angle * Math.PI) / 180;
  const sin = Math.sin(a);
  const cos = Math.cos(a);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const fx of [-0.5, 0.5]) {
    for (const fy of [top - 0.5, bottom - 0.5]) {
      const y = centerY + fx * layout.bottleWidth * sin + fy * layout.bottleHeight * cos;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return maxY - Math.min(1, Math.max(0, remaining)) * (maxY - minY);
}

/** 0 before `start`, 1 after `end`, eased in and out between them (as the AI profile scenes). */
function phase(value: number, start: number, end: number) {
  "worklet";
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** 0 before `start`, 1 after `end`, slowing down like an object coming to rest. */
function settle(value: number, start: number, end: number) {
  "worklet";
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return 1 - Math.pow(1 - t, 3);
}

/** Offsets and opacity of one prop of the uncorking, in canvas pixels and degrees. */
export interface UncorkPart {
  dx: number;
  dy: number;
  rotate: number;
  scaleX: number;
  opacity: number;
}

const part = (dx: number, dy: number, rotate: number, scaleX: number, opacity: number): UncorkPart => {
  "worklet";
  return { dx, dy, rotate, scaleX, opacity };
};

/**
 * The uncorking of the AI profile scene at `progress` (0..1), with its stage units scaled by
 * `scale`. Still wine: a corkscrew turns into the cork and pulls it out, and the aroma escapes.
 * Sparkling: the cage comes off, the cork wiggles loose and pops, and foam wells up. Every prop
 * is gone at the end, so the bottle can be lifted.
 */
export function uncorkScene(progress: number, kind: "still" | "sparkling", scale: number) {
  "worklet";
  const p = progress;
  if (kind === "still") {
    const turns = 1.5 * Math.min(1, Math.max(0, (p - 0.04) / 0.42));
    const pull = -20 * scale * settle(p, 0.5, 0.8);
    const leave = 1 - phase(p, 0.66, 0.86);
    const wisp = p < 0.72 ? 0 : p < 0.84 ? (0.7 * (p - 0.72)) / 0.12 : (0.7 * (1 - p)) / 0.16;
    return {
      cork: part(0, pull, 0, 1, leave),
      screw: part(0, 14 * scale * phase(p, 0.04, 0.46) + pull, 0, Math.cos(turns * 2 * Math.PI), phase(p, 0, 0.04) * leave),
      wisp: part(0, -18 * scale * phase(p, 0.72, 1), 0, 1, Math.max(0, wisp)),
      cage: part(0, 0, 0, 1, 0),
      foam: part(0, 0, 0, 0, 0),
    };
  }
  const off = phase(p, 0.06, 0.36);
  const wiggle = p < 0.58 ? 7 * Math.sin(phase(p, 0.38, 0.58) * 6 * Math.PI) : 0;
  const flight = settle(p, 0.58, 0.82);
  const up = settle(p, 0.6, 0.86);
  return {
    cork: part(10 * scale * flight, -70 * scale * flight, wiggle + 220 * flight, 1, 1 - phase(p, 0.74, 0.84)),
    cage: part(16 * scale * off, -12 * scale * off, 28 * off, 1, 1 - phase(p, 0.24, 0.4)),
    // Foam rises and grows (scaleX carries its size), then settles back before the bottle is lifted.
    foam: part(0, -9 * scale * up, 0, 0.3 + 0.7 * up, up * (1 - phase(p, 0.9, 1))),
    screw: part(0, 0, 0, 1, 0),
    wisp: part(0, 0, 0, 1, 0),
  };
}

/**
 * The uncorking (as in the AI profile scene) and the lift of the bottle from its stand, in ms.
 * A control that opens unrated uncorks by itself first, slowly enough to be seen, so the first rating pours at once.
 */
export const UNCORK_MS = 2200;
export const LIFT_MS = 420;

/** One loop of the drag demo shown to someone who never rated, in ms. */
export const GHOST_CYCLE_MS = 3400;
/** The demo pours up to the middle of the glasses. */
const GHOST_TARGET = 2.5;

export interface GhostFrame {
  /** 0 on the stand beside the real bottle, 1 held over the glasses. */
  held: number;
  /** Faint preview the demo has poured, 0..5. */
  level: number;
  opacity: number;
}

/**
 * The drag demo at `progress` (0..1 of a loop): a see-through copy of the bottle appears on the
 * stand, glides over the glasses pouring up to the middle, then fades while they drain.
 */
export function ghostFrame(progress: number): GhostFrame {
  "worklet";
  const t = progress * GHOST_CYCLE_MS;
  const span = (from: number, to: number) => Math.min(1, Math.max(0, (t - from) / (to - from)));
  const k = span(300, 1900);
  const held = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
  return {
    held,
    level: GHOST_TARGET * held * (1 - span(2300, 2900)),
    opacity: span(0, 300) * (1 - span(2300, 2700)),
  };
}

/** Height of the slider bar under the glasses, its glass thumb included. */
export const SLIDER_HEIGHT = 48;
/** Height of the glass that is the thumb, and thickness of the pill-shaped track. */
const SLIDER_GLASS = 44;
const SLIDER_TRACK = 8;

export interface SliderLayout {
  width: number;
  height: number;
  glassWidth: number;
  glassHeight: number;
  /** Top of the thumb glass. */
  glassTop: number;
  /** Centre of the thumb at 0 and at 5; the track runs between them. */
  start: number;
  end: number;
  trackY: number;
  trackHeight: number;
}

/**
 * The slider bar under the glasses, as wide as the control. Each whole score sits under its glass
 * (1.0 under the first, 5.0 under the last), so a full bar ends under the full last glass; 0 is
 * one glass to the left, over the bottle's stand.
 */
export function sliderLayout(layout: PourLayout, glass: GlassArt): SliderLayout {
  "worklet";
  const glassWidth = (SLIDER_GLASS * glass.width) / glass.height;
  const first = glassLeft(0, layout) + layout.glassWidth / 2;
  return {
    width: layout.width,
    height: SLIDER_HEIGHT,
    glassWidth,
    glassHeight: SLIDER_GLASS,
    glassTop: (SLIDER_HEIGHT - SLIDER_GLASS) / 2,
    start: first - layout.slot,
    end: first + 4 * layout.slot,
    trackY: (SLIDER_HEIGHT - SLIDER_TRACK) / 2,
    trackHeight: SLIDER_TRACK,
  };
}

/** Centre of the thumb for a score, clamped to 0..5. */
export function sliderX(score: number, slider: SliderLayout): number {
  "worklet";
  const clamped = Math.min(5, Math.max(0, score));
  return slider.start + (clamped / 5) * (slider.end - slider.start);
}

/** Raw (unsnapped) score under a position on the bar, clamped to 0..5. */
export function ratingFromSliderX(x: number, slider: SliderLayout): number {
  "worklet";
  const travel = slider.end - slider.start;
  if (travel <= 0) return 0;
  return Math.min(5, Math.max(0, ((x - slider.start) / travel) * 5));
}
