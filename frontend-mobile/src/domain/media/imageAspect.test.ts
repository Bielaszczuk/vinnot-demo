import { COVER_ASPECT, IMAGE_FRAMES, fitFrame, guideBand } from "./imageAspect";

describe("image frames", () => {
  it("defines one frame per displayed image kind", () => {
    expect(COVER_ASPECT).toBeCloseTo(16 / 9);
    expect(IMAGE_FRAMES.COVER).toEqual({ aspect: 16 / 9, round: false, guideAspect: 21 / 8, maxLongEdge: 2400, keepsTransparency: false });
    expect(IMAGE_FRAMES.AVATAR).toEqual({ aspect: 1, round: true, guideAspect: null, maxLongEdge: 1200, keepsTransparency: false });
    expect(IMAGE_FRAMES.WINE).toEqual({ aspect: 3 / 4, round: false, guideAspect: null, maxLongEdge: 2400, keepsTransparency: true });
    expect(IMAGE_FRAMES.LOGO).toEqual({ aspect: 1, round: false, guideAspect: null, maxLongEdge: 1200, keepsTransparency: true });
  });

  it("fits the frame inside the available space, limited by width or by height", () => {
    expect(fitFrame({ width: 320, height: 600 }, 16 / 9)).toEqual({ width: 320, height: 180 });
    expect(fitFrame({ width: 320, height: 600 }, 3 / 4)).toEqual({ width: 320, height: 426.6666666666667 });
    expect(fitFrame({ width: 400, height: 300 }, 3 / 4)).toEqual({ width: 225, height: 300 });
    expect(fitFrame({ width: 0, height: 300 }, 1)).toEqual({ width: 0, height: 0 });
    expect(fitFrame({ width: -10, height: 300 }, 1)).toEqual({ width: 0, height: 0 });
  });

  it("places the always visible strip in the middle of a cover frame", () => {
    expect(guideBand({ width: 336, height: 189 }, 21 / 8)).toEqual({ top: 30.5, height: 128 });
    expect(guideBand({ width: 336, height: 189 }, null)).toBeNull();
    // A guide wider than the frame would cover all of it, so no band is drawn.
    expect(guideBand({ width: 100, height: 100 }, 1 / 2)).toBeNull();
  });
});
