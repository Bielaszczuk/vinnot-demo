/**
 * Geometry of the taste wheel: one watercolor wedge per slice at equal angles, the first
 * centred at twelve o'clock and going clockwise, all on the same ring. Each wedge has an
 * organic, slightly wobbly outline (the same every time), a box for its wash texture turned
 * with it, and an invisible press sector. Also how a selected wedge grows while the rest fade,
 * and the size of the name written in the centre. Pure math, so it is tested without
 * rendering; the outline helpers are worklets because the selected wedge grows on the UI thread.
 */
import type { TasteSlice } from "@/domain/social/social.types";
import { fontSizes } from "@/shared/theme/typography";

export type WashVariant = 1 | 2 | 3;

/** What the outline of one wedge needs, kept plain so a worklet can take it. */
export interface WedgeShape {
  index: number;
  size: number;
  center: number;
  /** Middle angle in radians, clockwise from twelve o'clock. */
  mid: number;
  /** Half the wedge's angle, in radians. */
  half: number;
  inner: number;
  outer: number;
  /** Cream left between neighbours. */
  gap: number;
}

export interface WheelWedge {
  key: string;
  slice: TasteSlice;
  /** Which of the three wash textures paints it. */
  variant: WashVariant;
  /** Middle angle in radians, clockwise from twelve o'clock. */
  mid: number;
  shape: WedgeShape;
  /** The wash texture's box with the wedge upright; it is then turned by `mid` round the centre. */
  texture: { x: number; y: number; width: number; height: number };
  /** SVG path of the invisible press target: the wedge's whole angle range out to the edge. */
  sector: string;
}

export interface WedgeLook {
  opacity: number;
  /** 1 grows the outer edge fully. */
  grow: number;
}

export interface OutlinePoint {
  x: number;
  y: number;
}

/** The wheel is at most this many points across; on narrow cards it takes 88% of the content width. */
export const TASTE_WHEEL_MAX_SIZE = 290;
const CARD_WIDTH_SHARE = 0.88;
/** The ring's outer radius, as a share of half the wheel. */
const OUTER_SHARE = 0.9;
/** The ring's inner radius, as a share of its outer radius. */
const INNER_SHARE = 0.42;
/** A selected wedge's outer edge grows by this share. */
export const WEDGE_SELECTED_GROWTH = 0.035;
/** The lowest score of a view still fills this share of the ring, so its wedge stays easy to see and tap. */
export const WEDGE_MIN_REACH = 0.65;
/** The wedges that are not selected fade back. */
export const WEDGE_DIM_OPACITY = 0.3;
/** Points on each arc and on each side of the outline. */
export const WEDGE_ARC_POINTS = 24;
export const WEDGE_SIDE_POINTS = 10;
/** The darker line along the wedge's edge. */
export const TIDE_OPACITY = 0.4;
const TIDE_SHARE = 0.0133;
const GAP_SHARE = 0.0083;
const MIN_GAP = 2.5;
/** The wobble is drawn for a 600-point wheel and scaled to the real one. */
const WOBBLE_BASE = 600;
const WOBBLE_AMPLITUDES = [2.2, 1.4, 0.8] as const;
/** The inner arc wobbles less. */
const INNER_WOBBLE = 0.6;
/**
 * Share of the radius kept as the centre disc, where the grape-cluster emblem sits and a
 * selected wedge's name, score and wines are written; never under `MIN_HOLE`, so the text
 * always has the same room.
 */
export const WHEEL_HOLE_RATIO = 0.35;
const MIN_HOLE = 48;
/** A single slice cannot draw a closed arc from a point to itself. */
const FULL_TURN_GAP = 0.0001;

/** Width of the wheel in a card whose content is `contentWidth` wide (unknown until measured). */
export function tasteWheelSize(contentWidth: number | null, max = TASTE_WHEEL_MAX_SIZE): number {
  return contentWidth === null ? max : Math.min(max, Math.floor(contentWidth * CARD_WIDTH_SHARE));
}

export function wheelHole(size: number): number {
  return Math.max(MIN_HOLE, (size / 2) * WHEEL_HOLE_RATIO);
}

export function wedgeGap(size: number): number {
  return Math.max(MIN_GAP, size * GAP_SHARE);
}

export function tideWidth(size: number): number {
  return size * TIDE_SHARE;
}

/** The furthest any edge wobbles on a wheel of this size. */
export function maxWobble(size: number): number {
  return (size / WOBBLE_BASE) * (WOBBLE_AMPLITUDES[0] + WOBBLE_AMPLITUDES[1] + WOBBLE_AMPLITUDES[2]);
}

/**
 * How far an edge of wedge `index` strays at `t`: `edge` 0 is the outer arc, 1 the inner arc,
 * 2 the clockwise side and 3 the other side.
 */
export function wedgeWobble(index: number, edge: number, t: number, size: number): number {
  "worklet";
  const seed = index * 7.3 + edge * 3.1;
  return (
    (size / WOBBLE_BASE) *
    (2.2 * Math.sin(3 * t + seed) + 1.4 * Math.sin(7.7 * t + 1.9 * seed) + 0.8 * Math.sin(17 * t + 2.7 * seed))
  );
}

function polar(center: number, radius: number, angle: number): OutlinePoint {
  "worklet";
  return { x: center + radius * Math.sin(angle), y: center - radius * Math.cos(angle) };
}

/**
 * The organic outline as a polyline, clockwise: the outer arc, the clockwise side inwards, the
 * inner arc back and the other side outwards. The sides sit half a gap inside the wedge's
 * straight edges. `grow` 1 moves the outer arc out by `WEDGE_SELECTED_GROWTH`.
 */
export function wedgeOutlinePoints(shape: WedgeShape, grow: number): OutlinePoint[] {
  "worklet";
  const { index, size, center, mid, half, gap } = shape;
  const outer = shape.outer * (1 + WEDGE_SELECTED_GROWTH * grow);
  const inner = shape.inner + gap / 2;
  const offset = gap / 2;
  const points: OutlinePoint[] = [];
  const arc = (radius: number, edge: number, wobble: number, from: number, to: number) => {
    const span = half - Math.asin(Math.min(1, offset / radius));
    for (let step = 0; step < WEDGE_ARC_POINTS; step++) {
      const t = from + ((to - from) * step) / (WEDGE_ARC_POINTS - 1);
      points.push(polar(center, radius + wobble * wedgeWobble(index, edge, t, size), mid + t * span));
    }
  };
  const side = (direction: 1 | -1, edge: number, inwards: boolean) => {
    const angle = mid + direction * half;
    // Points along the straight edge, offset into the wedge, landing on both circles.
    const near = Math.sqrt(Math.max(0, inner * inner - offset * offset));
    const far = Math.sqrt(Math.max(0, outer * outer - offset * offset));
    for (let step = 0; step < WEDGE_SIDE_POINTS; step++) {
      const fraction = (inwards ? WEDGE_SIDE_POINTS - step : step + 1) / (WEDGE_SIDE_POINTS + 1);
      const along = near + (far - near) * fraction;
      const across = offset - wedgeWobble(index, edge, fraction, size);
      // Into the wedge is against the clockwise turn on the clockwise side, with it on the other.
      points.push({
        x: center + along * Math.sin(angle) - direction * across * Math.cos(angle),
        y: center - along * Math.cos(angle) - direction * across * Math.sin(angle),
      });
    }
  };
  arc(outer, 0, 1, -1, 1);
  side(1, 2, true);
  arc(inner, 1, INNER_WOBBLE, 1, -1);
  side(-1, 3, false);
  return points;
}

/** The organic outline as an SVG path, for Skia's clip and stroke. */
export function wedgeOutline(shape: WedgeShape, grow: number): string {
  "worklet";
  const points = wedgeOutlinePoints(shape, grow);
  let path = "";
  for (let index = 0; index < points.length; index++) {
    const point = points[index]!;
    path += `${index === 0 ? "M" : " L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }
  return `${path} Z`;
}

function point(cx: number, cy: number, radius: number, angle: number): string {
  return `${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`;
}

/** Annular sector between two angles in radians (SVG angles: 0 at three o'clock, clockwise). */
export function wedgePath(cx: number, cy: number, inner: number, outer: number, start: number, end: number): string {
  const large = end - start > Math.PI ? 1 : 0;
  return [
    `M ${point(cx, cy, outer, start)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${point(cx, cy, outer, end)}`,
    `L ${point(cx, cy, inner, end)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${point(cx, cy, inner, start)}`,
    "Z",
  ].join(" ");
}

/**
 * The wash texture covers the wedge's bounding box with the wedge upright, its top at the
 * grown outer edge; a wedge wider than 90 degrees takes a square round the whole wheel.
 */
function textureBox(shape: WedgeShape): WheelWedge["texture"] {
  const wobble = maxWobble(shape.size);
  const reach = shape.outer * (1 + WEDGE_SELECTED_GROWTH) + wobble;
  const { center, half } = shape;
  if (half > Math.PI / 4) return { x: center - reach, y: center - reach, width: 2 * reach, height: 2 * reach };
  const halfWidth = reach * Math.sin(half) + wobble;
  const bottom = center - (shape.inner - wobble) * Math.cos(half);
  return { x: center - halfWidth, y: center - reach, width: 2 * halfWidth, height: bottom - (center - reach) };
}

export function tasteWheelWedges(slices: TasteSlice[], size: number): WheelWedge[] {
  const count = slices.length;
  if (count === 0) return [];
  const center = size / 2;
  const hole = wheelHole(size);
  const outer = center * OUTER_SHARE;
  const inner = Math.max(hole, outer * INNER_SHARE);
  const step = (2 * Math.PI) / count;
  const span = count > 1 ? step / 2 : Math.PI - FULL_TURN_GAP / 2;
  // Each wedge is as long as its score: the best of the view reaches the rim.
  const scores = slices.map((slice) => slice.score);
  const low = Math.min(...scores);
  const spread = Math.max(...scores) - low;
  const reachOf = (score: number) => (spread > 0 ? WEDGE_MIN_REACH + (1 - WEDGE_MIN_REACH) * ((score - low) / spread) : 1);
  return slices.map((slice, index) => {
    const mid = index * step;
    const reach = inner + (outer - inner) * reachOf(slice.score);
    const shape: WedgeShape = { index, size, center, mid, half: step / 2, inner, outer: reach, gap: wedgeGap(size) };
    // SVG angles start at three o'clock.
    const middle = mid - Math.PI / 2;
    return {
      key: `${slice.kind}:${slice.value}`,
      slice,
      variant: ((index % 3) + 1) as WashVariant,
      mid,
      shape,
      texture: textureBox(shape),
      sector: wedgePath(center, center, hole, center, middle - span, middle + span),
    };
  });
}

/** How a wedge looks. Without a selection every wedge stays as it is. */
export function wedgeLook(selected: boolean, anySelected: boolean): WedgeLook {
  if (selected) return { opacity: 1, grow: 1 };
  return { opacity: anySelected ? WEDGE_DIM_OPACITY : 1, grow: 0 };
}

/** The widest text box that fits in the centre disc. */
export function centreTextWidth(hole: number): number {
  return Math.floor(hole * Math.SQRT2);
}

/** Long names start smaller; they also shrink to fit two lines. */
export function centreLabelFontSize(label: string): number {
  if (label.length <= 12) return fontSizes.xs;
  if (label.length <= 24) return fontSizes.meta;
  return fontSizes["2xs"];
}
