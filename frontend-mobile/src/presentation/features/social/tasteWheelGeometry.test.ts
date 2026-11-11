import { describe, expect, it } from "@jest/globals";
import {
  TASTE_WHEEL_MAX_SIZE,
  WEDGE_ARC_POINTS,
  WEDGE_DIM_OPACITY,
  WEDGE_SELECTED_GROWTH,
  WEDGE_SIDE_POINTS,
  centreLabelFontSize,
  centreTextWidth,
  maxWobble,
  tasteWheelSize,
  tasteWheelWedges,
  tideWidth,
  wedgeGap,
  wedgeLook,
  wedgeOutline,
  wedgeOutlinePoints,
  wedgePath,
  wedgeWobble,
  wheelHole,
  type WheelWedge,
} from "./tasteWheelGeometry";
import type { TasteSlice } from "@/domain/social/social.types";

const slice = (value: string, score: number, kind: TasteSlice["kind"] = "GRAPE"): TasteSlice => ({
  kind,
  value,
  label: value,
  score,
  tone: null,
  ratedWines: 1,
});
const many = (count: number, score = 5) => Array.from({ length: count }, (_, index) => slice(`s${index}`, score));
const radiusOf = (point: { x: number; y: number }, center: number) => Math.hypot(point.x - center, point.y - center);
/** Angle of a point clockwise from twelve o'clock, in radians. */
const angleOf = (point: { x: number; y: number }, center: number) => Math.atan2(point.x - center, center - point.y);
/** Signed distance of a point from one of the wedge's straight edges, positive inside the wedge. */
function insideEdge(point: { x: number; y: number }, wedge: WheelWedge, side: 1 | -1): number {
  const { center, mid, half } = wedge.shape;
  const edge = mid + side * half;
  const x = point.x - center;
  const y = center - point.y;
  // Cross product with the edge direction: how far the point sits on the wedge's side of it.
  return side * (y * Math.sin(edge) - x * Math.cos(edge));
}

describe("taste wheel wedges", () => {
  it("draws nothing without slices", () => {
    expect(tasteWheelWedges([], 240)).toEqual([]);
  });

  it("draws one wedge per entry at equal angles, the first centred at twelve o'clock, going clockwise", () => {
    const wedges = tasteWheelWedges([slice("RED", 5, "TYPE"), slice("malbec", 4), slice("syrah", 3), slice("cot", 2)], 240);
    expect(wedges.map((wedge) => wedge.key)).toEqual(["TYPE:RED", "GRAPE:malbec", "GRAPE:syrah", "GRAPE:cot"]);
    expect(wedges.map((wedge) => wedge.mid)).toEqual([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]);
    for (const wedge of wedges) expect(wedge.shape.half).toBeCloseTo(Math.PI / 4);
  });

  it("makes each wedge as long as its score: the best reaches the rim, the lowest 65% of the ring, equal scores all full", () => {
    const rim = 145 * 0.9;
    const inner = rim * 0.42;
    const wedges = tasteWheelWedges([slice("a", 4.5), slice("b", 4), slice("c", 3.5)], 290);
    expect(wedges.map((wedge) => wedge.shape.inner)).toEqual([inner, inner, inner]);
    expect(wedges[0]!.shape.outer).toBeCloseTo(rim);
    expect(wedges[1]!.shape.outer).toBeCloseTo(inner + (rim - inner) * 0.825);
    expect(wedges[2]!.shape.outer).toBeCloseTo(inner + (rim - inner) * 0.65);
    expect(new Set(tasteWheelWedges(many(3, 4), 290).map((wedge) => wedge.shape.outer))).toEqual(new Set([rim]));
    // On a small wheel the ring starts at the centre disc, so the text keeps its room.
    expect(tasteWheelWedges(many(3), 240)[0]!.shape.inner).toBe(wheelHole(240));
  });

  it("cycles the three wash textures by index", () => {
    expect(tasteWheelWedges(many(7), 240).map((wedge) => wedge.variant)).toEqual([1, 2, 3, 1, 2, 3, 1]);
  });

  it("keeps a cream gap of about 0.83% of the wheel between neighbours, never under 2.5 points", () => {
    expect(wedgeGap(600)).toBeCloseTo(4.98);
    expect(wedgeGap(240)).toBe(2.5);
    expect(tideWidth(600)).toBeCloseTo(7.98);
    expect(tasteWheelWedges(many(3), 600)[0]!.shape.gap).toBeCloseTo(4.98);
  });
});

describe("organic outline", () => {
  it("wobbles each edge with three sines scaled to the wheel, the same every time", () => {
    expect(wedgeWobble(0, 0, 0, 600)).toBe(0);
    expect(wedgeWobble(1, 2, 0.5, 600)).toBeCloseTo(0.77206, 4);
    expect(wedgeWobble(1, 2, 0.5, 300)).toBeCloseTo(0.38603, 4);
    expect(maxWobble(600)).toBeCloseTo(4.4);
    for (let t = -1; t <= 1; t += 0.1) expect(Math.abs(wedgeWobble(3, 1, t, 290))).toBeLessThanOrEqual(maxWobble(290));
  });

  it("draws a polyline of 24 points on each arc and 10 on each side", () => {
    const [wedge] = tasteWheelWedges(many(5), 290);
    expect(WEDGE_ARC_POINTS).toBe(24);
    expect(WEDGE_SIDE_POINTS).toBe(10);
    expect(wedgeOutlinePoints(wedge!.shape, 0)).toHaveLength(2 * 24 + 2 * 10);
  });

  it("is deterministic, different for each slice, and written as a closed SVG path", () => {
    const first = tasteWheelWedges(many(5), 290);
    const again = tasteWheelWedges(many(5), 290);
    expect(first.map((wedge) => wedgeOutline(wedge.shape, 0))).toEqual(again.map((wedge) => wedgeOutline(wedge.shape, 0)));
    const outline = wedgeOutline(first[0]!.shape, 0);
    expect(outline).toMatch(/^M [\d.]+ [\d.]+( L [\d.]+ [\d.]+){67} Z$/);
    // Turned back to twelve o'clock, two wedges still differ: each has its own wobble.
    const radii = (wedge: WheelWedge) => wedgeOutlinePoints(wedge.shape, 0).map((point) => radiusOf(point, 145).toFixed(2));
    expect(radii(first[0]!)).not.toEqual(radii(first[1]!));
  });

  it.each([1, 2, 3, 5, 8, 12])("keeps every point of %p wedges inside the ring, give or take the wobble", (count) => {
    const size = 290;
    const wobble = maxWobble(size);
    for (const wedge of tasteWheelWedges(many(count), size)) {
      const { inner, outer, gap } = wedge.shape;
      for (const point of wedgeOutlinePoints(wedge.shape, 0)) {
        const radius = radiusOf(point, size / 2);
        expect(radius).toBeGreaterThanOrEqual(inner + gap / 2 - 0.6 * wobble - 0.01);
        expect(radius).toBeLessThanOrEqual(outer + wobble + 0.01);
      }
    }
  });

  it("stays inside its own angle, the gap kept from each straight edge give or take the wobble", () => {
    const size = 290;
    const wobble = maxWobble(size);
    for (const count of [3, 5, 8]) {
      for (const wedge of tasteWheelWedges(many(count), size)) {
        for (const point of wedgeOutlinePoints(wedge.shape, 0)) {
          expect(insideEdge(point, wedge, 1)).toBeGreaterThanOrEqual(wedge.shape.gap / 2 - wobble - 0.01);
          expect(insideEdge(point, wedge, -1)).toBeGreaterThanOrEqual(wedge.shape.gap / 2 - wobble - 0.01);
        }
        // The middle of the outer arc lies on the wedge's own direction.
        const top = wedgeOutlinePoints(wedge.shape, 0)[11]!;
        const off = Math.atan2(Math.sin(angleOf(top, size / 2) - wedge.mid), Math.cos(angleOf(top, size / 2) - wedge.mid));
        expect(Math.abs(off)).toBeLessThan(wedge.shape.half / 4);
      }
    }
  });

  it("grows the selected wedge's outer edge by about 3.5%, its inner edge unchanged", () => {
    const [wedge] = tasteWheelWedges(many(4), 290);
    const rest = wedgeOutlinePoints(wedge!.shape, 0);
    const grown = wedgeOutlinePoints(wedge!.shape, 1);
    expect(WEDGE_SELECTED_GROWTH).toBe(0.035);
    for (let index = 0; index < WEDGE_ARC_POINTS; index++) {
      expect(radiusOf(grown[index]!, 145) - radiusOf(rest[index]!, 145)).toBeCloseTo(wedge!.shape.outer * 0.035);
    }
    const innerStart = WEDGE_ARC_POINTS + WEDGE_SIDE_POINTS;
    expect(grown.slice(innerStart, innerStart + WEDGE_ARC_POINTS)).toEqual(rest.slice(innerStart, innerStart + WEDGE_ARC_POINTS));
  });
});

describe("wash texture", () => {
  it("covers a narrow wedge's bounding box in its upright frame, top at the grown outer edge", () => {
    const size = 290;
    const [wedge] = tasteWheelWedges(many(8), size);
    const { inner, half } = wedge!.shape;
    const reach = wedge!.shape.outer * (1 + WEDGE_SELECTED_GROWTH) + maxWobble(size);
    const { x, y, width, height } = wedge!.texture;
    expect(y).toBeCloseTo(145 - reach);
    expect(x + width / 2).toBeCloseTo(145);
    expect(width).toBeCloseTo(2 * (reach * Math.sin(half) + maxWobble(size)));
    expect(y + height).toBeCloseTo(145 - (inner - maxWobble(size)) * Math.cos(half));
  });

  it("covers a 2R square for wedges wider than 90 degrees", () => {
    const size = 290;
    const reach = 145 * 0.9 * (1 + WEDGE_SELECTED_GROWTH) + maxWobble(size);
    for (const count of [1, 2, 3]) {
      const [wedge] = tasteWheelWedges(many(count), size);
      expect(wedge!.texture.x).toBeCloseTo(145 - reach);
      expect(wedge!.texture.y).toBeCloseTo(145 - reach);
      expect(wedge!.texture.width).toBeCloseTo(2 * reach);
      expect(wedge!.texture.height).toBeCloseTo(2 * reach);
    }
  });
});

describe("press targets", () => {
  it("keeps an invisible press sector over each wedge: its whole angle range, out to the outer radius", () => {
    const wedges = tasteWheelWedges(many(4), 240);
    const hole = wheelHole(240);
    for (const wedge of wedges) {
      expect(wedge.sector).toMatch(/^M .* Z$/);
      expect(wedge.sector).toContain(`A ${hole} ${hole} `);
      expect(wedge.sector).toContain("A 120 120 ");
    }
    // The first sector spans the top quarter, centred on twelve o'clock.
    expect(wedges[0]!.sector).toBe(wedgePath(120, 120, hole, 120, -Math.PI / 2 - Math.PI / 4, -Math.PI / 4));
  });

  it("centres each press sector on its wedge: a tap at wedge i's middle angle hits sector i, one just across its edge hits the neighbour", () => {
    const size = 290;
    const center = size / 2;
    const radius = (wheelHole(size) + center) / 2;
    /** The sector whose angle range holds a tap, read from each sector's own arc end points. */
    const hit = (sectors: string[], clockwiseFromTop: number) => {
      const tap = clockwiseFromTop - Math.PI / 2;
      const x = center + radius * Math.cos(tap);
      const y = center + radius * Math.sin(tap);
      const angle = Math.atan2(y - center, x - center);
      return sectors.findIndex((path) => {
        const [, x0, y0, x1, y1] = path.match(/^M (\S+) (\S+) A \S+ \S+ 0 \d 1 (\S+) (\S+)/)!.map(Number);
        const from = Math.atan2(y0! - center, x0! - center);
        const span = (Math.atan2(y1! - center, x1! - center) - from + 4 * Math.PI) % (2 * Math.PI);
        return (angle - from + 4 * Math.PI) % (2 * Math.PI) < span;
      });
    };
    for (const count of [3, 5, 8]) {
      const sectors = tasteWheelWedges(many(count), size).map((wedge) => wedge.sector);
      const step = (2 * Math.PI) / count;
      for (let index = 0; index < count; index++) {
        expect(hit(sectors, index * step)).toBe(index);
        expect(hit(sectors, index * step + step / 2 - 0.02)).toBe(index);
        expect(hit(sectors, index * step + step / 2 + 0.02)).toBe((index + 1) % count);
        expect(hit(sectors, index * step - step / 2 - 0.02)).toBe((index - 1 + count) % count);
      }
    }
  });

  it("closes a single entry's sector into a ring with large arcs, and uses small arcs under half a turn", () => {
    const [wedge] = tasteWheelWedges([slice("RED", 4, "TYPE")], 240);
    expect(wedge!.sector).toContain(" 0 1 1 ");
    expect(wedgePath(50, 50, 10, 40, 0, Math.PI / 2)).toContain(" 0 0 1 ");
  });
});

describe("selection", () => {
  it("grows the selected wedge at full opacity, fades the rest to 30%, and leaves all as they are without one", () => {
    expect(wedgeLook(false, false)).toEqual({ opacity: 1, grow: 0 });
    expect(wedgeLook(true, true)).toEqual({ opacity: 1, grow: 1 });
    expect(wedgeLook(false, true)).toEqual({ opacity: WEDGE_DIM_OPACITY, grow: 0 });
    expect(WEDGE_DIM_OPACITY).toBe(0.3);
  });
});

describe("wheel size", () => {
  it("is about 290 points across, or 88% of the card's content width when that is smaller", () => {
    expect(TASTE_WHEEL_MAX_SIZE).toBe(290);
    expect(tasteWheelSize(null)).toBe(290);
    expect(tasteWheelSize(400)).toBe(290);
    expect(tasteWheelSize(311)).toBe(273);
    expect(tasteWheelSize(311, 240)).toBe(240);
  });

  it("keeps the centre disc at least as wide for the text as before, at any size", () => {
    expect(wheelHole(240)).toBe(48);
    expect(wheelHole(290)).toBeCloseTo(50.75);
    for (const size of [200, 240, 273, 290]) expect(centreTextWidth(wheelHole(size))).toBeGreaterThanOrEqual(67);
  });
});

describe("centre label", () => {
  it("fits the text box in the centre disc's inscribed width", () => {
    expect(centreTextWidth(48)).toBe(Math.floor(48 * Math.SQRT2));
  });

  it("starts long names at a smaller size", () => {
    expect(centreLabelFontSize("Malbec")).toBe(12);
    expect(centreLabelFontSize("Cabernet Sauvignon")).toBe(11);
    expect(centreLabelFontSize("Champagne Premier Cru")).toBe(11);
    expect(centreLabelFontSize("A".repeat(40))).toBe(10);
  });
});
