import { BOTTLE_ART, GLASS_ART, wineTop } from "./ratingArt";
import {
  POUR_ANGLE,
  POUR_GLASS_HEIGHT,
  RIM_ENTRY,
  bottleStage,
  corkBox,
  GHOST_CYCLE_MS,
  ghostFrame,
  uncorkScene,
  wineSurfaceY,
  glassLeft,
  pourFrame,
  pourLayout,
  ratingFromX,
  ratingFromSliderX,
  wineBoxes,
  SLIDER_HEIGHT,
  sliderLayout,
  sliderX,
} from "./pourGeometry";

const glass = GLASS_ART.bordeaux;
const bottle = BOTTLE_ART.dark;

/** Inner left wall of the bordeaux art (fraction of its width) at a fraction of its height, measured from the image. */
const BORDEAUX_LEFT_WALL: readonly [number, number][] = [
  [0.03, 0.16],
  [0.1, 0.11],
  [0.2, 0.05],
  [0.3, 0.02],
  [0.35, 0.03],
  [0.4, 0.08],
  [0.45, 0.19],
  [0.5, 0.37],
];

function leftWallAt(y: number): number {
  let [y0, x0] = [0.03, 0.16];
  for (const [y1, x1] of BORDEAUX_LEFT_WALL) {
    if (y <= y1) return y1 === y0 ? x1 : x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
    [y0, x0] = [y1, x1];
  }
  return x0;
}

/** Points along the quadratic stream, as fractions of the glass being filled. */
function streamInGlass(value: number) {
  const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle);
  const f = pourFrame(value, layout, glass, bottle);
  const index = Math.min(4, Math.max(0, Math.floor(value - 1e-6)));
  const left = glassLeft(index, layout);
  return Array.from({ length: 21 }, (_, step) => {
    const t = step / 20;
    const x = (1 - t) ** 2 * f.lipX + 2 * (1 - t) * t * f.controlX + t ** 2 * f.targetX;
    const y = (1 - t) ** 2 * f.lipY + 2 * (1 - t) * t * f.controlY + t ** 2 * f.targetY;
    return { x: (x - left) / layout.glassWidth, y: (y - layout.top) / layout.glassHeight };
  });
}

describe("pour geometry", () => {
  it("lays five glasses after a stand for the upright bottle, compact without a width", () => {
    const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle);
    const bottleHeight = 56 * 1.3;
    const bottleWidth = (bottleHeight * bottle.width) / bottle.height;
    expect(layout.glassHeight).toBe(56);
    expect(layout.bottleHeight).toBeCloseTo(bottleHeight);
    expect(layout.bottleWidth).toBeCloseTo(bottleWidth);
    expect(layout.slot).toBeCloseTo(44.8);
    expect(layout.inner).toBeCloseTo(224);
    expect(layout.side).toBeCloseTo(56 * 0.65 + bottleWidth);
    expect(layout.top).toBeCloseTo(56 * 0.9);
    expect(layout.width).toBe(Math.floor(layout.side + 224));
    expect(layout.height).toBe(Math.round(56 * 1.9 + 8));
    expect(layout.glassWidth).toBeCloseTo((56 * 177) / 360);
  });

  it("spreads the glasses over the available width, so no space is left on either side", () => {
    const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle, 329);
    expect(layout.width).toBe(329);
    expect(layout.slot).toBeCloseTo((329 - layout.side) / 5);
    // Never wider apart than 1.2 glass heights, never tighter than the compact row.
    expect(pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle, 900).slot).toBeCloseTo(56 * 1.2);
    expect(pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle, 200).slot).toBeCloseTo(44.8);
  });

  it("stands the bottle on the glasses' base line, left of the first glass", () => {
    for (const width of [undefined, 329]) {
      const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle, width);
      expect(layout.standY + layout.bottleHeight / 2).toBeCloseTo(layout.top + layout.glassHeight);
      expect(layout.standX - layout.bottleWidth / 2).toBeGreaterThan(0);
      expect(layout.standX + layout.bottleWidth / 2).toBeLessThan(glassLeft(0, layout));
    }
  });

  it("leaves room under the standing bottle for its shadow", () => {
    const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle);
    expect(layout.height - (layout.standY + layout.bottleHeight / 2)).toBeGreaterThanOrEqual(6);
    expect(layout.standX - layout.bottleWidth / 2).toBeCloseTo(56 * 0.2);
  });

  it("keeps the wine surface level: full at the shoulder, empty at the base, wherever the bottle leans", () => {
    const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle);
    const [top, bottom] = bottle.wine;
    const upright = (remaining: number) => wineSurfaceY(layout.standX, layout.standY, 0, remaining, layout, bottle);
    const shoulder = layout.standY + (top - 0.5) * layout.bottleHeight;
    const base = layout.standY + (bottom - 0.5) * layout.bottleHeight;
    expect(upright(1)).toBeCloseTo(shoulder);
    expect(upright(0)).toBeCloseTo(base);
    expect(upright(0.5)).toBeCloseTo((shoulder + base) / 2);
    // Turned past horizontal, the neck is the lowest point, so the wine gathers there.
    const tilted = (remaining: number) => wineSurfaceY(100, 50, 118, remaining, layout, bottle);
    expect(tilted(1)).toBeLessThan(tilted(0.5));
    expect(tilted(0.5)).toBeLessThan(tilted(0));
  });

  it("uncorks like the AI profile scene: the corkscrew turns in and pulls the cork out, then both are gone", () => {
    const start = uncorkScene(0, "still", 1);
    expect(start.cork.dy).toBeCloseTo(0);
    expect(start.cork.opacity).toBe(1);
    expect(start.screw.opacity).toBe(0);
    const turning = uncorkScene(0.25, "still", 1);
    expect(turning.screw.opacity).toBe(1);
    expect(turning.screw.dy).toBeGreaterThan(0);
    expect(Math.abs(turning.screw.scaleX)).toBeLessThanOrEqual(1);
    const pulled = uncorkScene(0.75, "still", 1);
    expect(pulled.cork.dy).toBeLessThan(0);
    expect(pulled.screw.dy).toBeLessThan(turning.screw.dy);
    const done = uncorkScene(1, "still", 1);
    expect([done.cork.opacity, done.screw.opacity, done.wisp.opacity]).toEqual([0, 0, 0]);
  });

  it("pops a sparkling cork: the cage comes off, the cork flies and foam wells up, then all are gone", () => {
    const start = uncorkScene(0, "sparkling", 1);
    expect(start.cage.opacity).toBe(1);
    expect(start.cork.dy).toBeCloseTo(0);
    expect(start.cork.opacity).toBe(1);
    const flying = uncorkScene(0.7, "sparkling", 1);
    expect(flying.cage.opacity).toBe(0);
    expect(flying.cork.dy).toBeLessThan(-30);
    expect(flying.foam.opacity).toBeGreaterThan(0);
    const done = uncorkScene(1, "sparkling", 1);
    expect([done.cork.opacity, done.cage.opacity, done.foam.opacity]).toEqual([0, 0, 0]);
  });

  it("keeps the bottle corked at 0, pouring from 0.1 to 4.9 and standing finished at 5.0", () => {
    expect(bottleStage(0)).toBe("corked");
    expect(bottleStage(0.1)).toBe("pouring");
    expect(bottleStage(4.9)).toBe("pouring");
    expect(bottleStage(5)).toBe("finished");
  });

  it("puts the cork in the bottle mouth with part of it showing above the lip", () => {
    const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle);
    const lipX = (bottle.lip[0] / bottle.width - 0.5) * layout.bottleWidth;
    const lipY = (bottle.lip[1] / bottle.height - 0.5) * layout.bottleHeight;
    const cork = corkBox(layout, bottle);
    expect(cork.x + cork.width / 2).toBeCloseTo(lipX);
    expect(cork.y).toBeLessThan(lipY);
    expect(cork.y + cork.height).toBeGreaterThan(lipY);
    expect(cork.width).toBeLessThan(layout.bottleWidth / 2);
  });

  it("maps the finger position over the rail to a rating", () => {
    const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle);
    expect(ratingFromX(layout.side, layout)).toBe(0);
    expect(ratingFromX(layout.side + layout.inner, layout)).toBeCloseTo(5);
    expect(ratingFromX(layout.side + layout.inner / 2, layout)).toBeCloseTo(2.5);
  });

  it("holds the bottle mouth just above the left rim of the glass being filled", () => {
    const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle);
    for (const value of [0.3, 2.2, 2.9, 3.0, 5]) {
      const index = Math.min(4, Math.floor(value - 1e-6));
      const frame = pourFrame(value, layout, glass, bottle);
      expect(frame.lipX).toBeCloseTo(glassLeft(index, layout) + RIM_ENTRY * layout.glassWidth);
      expect(frame.lipY).toBeLessThan(layout.top + 0.006 * layout.glassHeight);
      expect(frame.ready).toBe(1);
    }
  });

  it("lands the stream on the wine surface between the near wall and the centre", () => {
    const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle);
    const frame = pourFrame(2.2, layout, glass, bottle);
    const third = glassLeft(2, layout);
    const landing = (frame.targetX - third) / layout.glassWidth;
    expect(frame.targetY).toBeCloseTo(layout.top + wineTop(glass.box, 0.2) * layout.glassHeight);
    expect(landing).toBeGreaterThan(RIM_ENTRY);
    expect(landing).toBeLessThan(glass.box[0] + glass.box[2] / 2);
  });

  it("keeps the whole stream inside the glass: in through the rim, never through the wall", () => {
    for (const value of [0.1, 0.5, 1.0, 2.1, 3.5, 4.9, 5]) {
      for (const point of streamInGlass(value)) {
        if (point.y < 0.03) {
          // Above the rim: right of the rim's left end, so it enters through the opening.
          expect(point.x).toBeGreaterThanOrEqual(RIM_ENTRY - 1e-9);
        } else {
          expect(point.x).toBeGreaterThan(leftWallAt(point.y));
          expect(point.x).toBeLessThan(1 - leftWallAt(point.y));
        }
      }
    }
  });

  it("moves the bottle to the next glass at the start of each glass and only pours once it is there", () => {
    const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle);
    const before = pourFrame(1, layout, glass, bottle);
    const midway = pourFrame(1.04, layout, glass, bottle);
    const after = pourFrame(1.1, layout, glass, bottle);
    expect(before.lipX).toBeCloseTo(glassLeft(0, layout) + RIM_ENTRY * layout.glassWidth);
    expect(after.lipX).toBeCloseTo(glassLeft(1, layout) + RIM_ENTRY * layout.glassWidth);
    expect(midway.lipX).toBeGreaterThan(before.lipX);
    expect(midway.lipX).toBeLessThan(after.lipX);
    expect(midway.ready).toBeGreaterThan(0);
    expect(midway.ready).toBeLessThan(1);
    // The first glass needs no carry: the bottle is lifted straight over it from the stand.
    expect(pourFrame(0.01, layout, glass, bottle).lipX).toBeCloseTo(before.lipX);
    expect(pourFrame(0.01, layout, glass, bottle).ready).toBe(1);
  });

  it("turns the bottle on its centre so that, at the pouring angle, its mouth sits on the lip point", () => {
    const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle);
    const frame = pourFrame(3.6, layout, glass, bottle);
    const a = (POUR_ANGLE * Math.PI) / 180;
    const ox = (bottle.lip[0] / bottle.width - 0.5) * layout.bottleWidth;
    const oy = (bottle.lip[1] / bottle.height - 0.5) * layout.bottleHeight;
    expect(frame.bottleCenterX + ox * Math.cos(a) - oy * Math.sin(a)).toBeCloseTo(frame.lipX);
    expect(frame.bottleCenterY + ox * Math.sin(a) + oy * Math.cos(a)).toBeCloseTo(frame.lipY);
  });

  it("keeps the tilted bottle inside the canvas", () => {
    for (const layout of [
      pourLayout(POUR_GLASS_HEIGHT.md, glass, bottle),
      pourLayout(POUR_GLASS_HEIGHT.lg, glass, BOTTLE_ART.sparkling, 329),
    ]) {
      const a = (POUR_ANGLE * Math.PI) / 180;
      for (const value of [0.1, 1.5, 4.9]) {
        const frame = pourFrame(value, layout, glass, bottle);
        for (const [cx, cy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const) {
          const x = (cx * layout.bottleWidth) / 2;
          const y = (cy * layout.bottleHeight) / 2;
          expect(frame.bottleCenterY + x * Math.sin(a) + y * Math.cos(a)).toBeGreaterThanOrEqual(0);
          expect(frame.bottleCenterX + x * Math.cos(a) - y * Math.sin(a)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("pours into the last glass at 5.0", () => {
    const layout = pourLayout(POUR_GLASS_HEIGHT.lg, glass, bottle);
    const frame = pourFrame(5, layout, glass, bottle);
    expect(frame.targetY).toBeCloseTo(layout.top + glass.box[1] * layout.glassHeight);
  });
});

describe("drag demo", () => {
  const at = (ms: number) => ghostFrame(ms / GHOST_CYCLE_MS);

  it("starts hidden on the stand, with no wine in the glasses", () => {
    expect(at(0)).toEqual({ held: 0, level: 0, opacity: 0 });
  });

  it("glides over the glasses, pouring a faint preview up to the middle", () => {
    const halfway = at(1100);
    const there = at(2000);
    expect(halfway.opacity).toBe(1);
    expect(halfway.held).toBeGreaterThan(0);
    expect(halfway.level).toBeGreaterThan(0);
    expect(there.held).toBe(1);
    expect(there.level).toBeCloseTo(2.5);
    expect(there.level).toBeGreaterThan(halfway.level);
  });

  it("fades out and drains before the next loop", () => {
    const end = at(GHOST_CYCLE_MS - 1);
    expect(end.opacity).toBe(0);
    expect(end.level).toBe(0);
  });
});

describe("wine in a glass", () => {
  it("uncovers the wine art from the fill level down, with a thin surface band only when filled", () => {
    const half = wineBoxes(10, 20, 30, 60, glass.box, 0.5);
    const top = 20 + wineTop(glass.box, 0.5) * 60;
    expect(half.wine).toEqual({ x: 10, y: top, width: 30, height: 20 + 60 - top });
    expect(half.surface).toEqual({ x: 10, y: top, width: 30, height: 60 * 0.014 });
    const empty = wineBoxes(10, 20, 30, 60, glass.box, 0);
    expect(empty.wine.y).toBeCloseTo(20 + (glass.box[1] + glass.box[3]) * 60);
    expect(empty.surface.height).toBe(0);
  });
});

describe("slider bar", () => {
  const pour = pourLayout(POUR_GLASS_HEIGHT.md, glass, bottle, 300);
  const slider = sliderLayout(pour, glass);
  const glassCentre = (index: number) => glassLeft(index, pour) + pour.glassWidth / 2;

  it("spans the glasses above, with a small glass as its thumb", () => {
    expect(slider.width).toBe(pour.width);
    expect(slider.height).toBe(SLIDER_HEIGHT);
    expect(slider.glassHeight).toBeLessThan(SLIDER_HEIGHT);
    expect(slider.glassWidth).toBeCloseTo((slider.glassHeight * glass.width) / glass.height);
    // The thumb glass never leaves the bar.
    expect(slider.start - slider.glassWidth / 2).toBeGreaterThanOrEqual(0);
    expect(slider.end + slider.glassWidth / 2).toBeLessThanOrEqual(pour.width);
    expect(slider.glassTop + slider.glassHeight).toBeLessThanOrEqual(SLIDER_HEIGHT);
  });

  it("puts each whole score under its glass: 1.0 under the first, 5.0 under the last", () => {
    for (const score of [1, 2, 3, 4, 5]) {
      expect(sliderX(score, slider)).toBeCloseTo(glassCentre(score - 1));
    }
    // 0 is one glass to the left of the first, over the bottle's stand.
    expect(slider.start).toBeCloseTo(glassCentre(0) - pour.slot);
    expect(ratingFromSliderX(glassCentre(4), slider)).toBeCloseTo(5);
  });

  it("works for both control sizes and every glass shape", () => {
    for (const size of ["md", "lg"] as const) {
      for (const shape of Object.values(GLASS_ART)) {
        for (const available of [undefined, 280, 420]) {
          const layout = pourLayout(POUR_GLASS_HEIGHT[size], shape, bottle, available);
          const bar = sliderLayout(layout, shape);
          expect(bar.start - bar.glassWidth / 2).toBeGreaterThanOrEqual(0);
          expect(bar.end + bar.glassWidth / 2).toBeLessThanOrEqual(layout.width);
          expect(sliderX(5, bar)).toBeCloseTo(glassLeft(4, layout) + layout.glassWidth / 2);
        }
      }
    }
  });

  it("stands a bigger glass on the bar, about the size of the glasses above", () => {
    expect(slider.glassHeight).toBe(44);
    expect(SLIDER_HEIGHT).toBeGreaterThanOrEqual(slider.glassHeight);
  });

  it("centres the glass on the track, the track crossing its middle", () => {
    expect(slider.glassTop).toBeGreaterThanOrEqual(0);
    expect(slider.glassTop + slider.glassHeight / 2).toBeCloseTo(slider.trackY + slider.trackHeight / 2);
  });

  it("places the thumb at the far left unrated, at the far right at 5.0 and in between", () => {
    expect(sliderX(0, slider)).toBe(slider.start);
    expect(sliderX(5, slider)).toBe(slider.end);
    expect(sliderX(2.5, slider)).toBeCloseTo((slider.start + slider.end) / 2);
  });

  it("reads the score back from the thumb position", () => {
    for (const score of [0, 0.1, 1.7, 2.5, 4.9, 5]) {
      expect(ratingFromSliderX(sliderX(score, slider), slider)).toBeCloseTo(score);
    }
  });

  it("clamps both ways to the 0–5 scale", () => {
    expect(sliderX(-1, slider)).toBe(slider.start);
    expect(sliderX(7, slider)).toBe(slider.end);
    expect(ratingFromSliderX(-40, slider)).toBe(0);
    expect(ratingFromSliderX(slider.width + 40, slider)).toBe(5);
  });
});
