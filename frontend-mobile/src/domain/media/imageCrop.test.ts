import {
  MAX_CROP_ZOOM,
  MIN_CROP_ZOOM,
  clampCropOffset,
  clampCropZoom,
  coverScale,
  cropRect,
  maxCropOffset,
} from "./imageCrop";

const landscape = { width: 4000, height: 3000 };
const portrait = { width: 3000, height: 4000 };
const coverFrame = { width: 320, height: 180 };

describe("crop zoom", () => {
  it("keeps the zoom between filling the frame and four times that", () => {
    expect(MIN_CROP_ZOOM).toBe(1);
    expect(MAX_CROP_ZOOM).toBe(4);
    expect(clampCropZoom(0.5)).toBe(1);
    expect(clampCropZoom(2.5)).toBe(2.5);
    expect(clampCropZoom(9)).toBe(4);
    expect(clampCropZoom(Number.NaN)).toBe(1);
  });

  it("scales the photo so it covers the frame", () => {
    // Width decides for a 4:3 photo in a 16:9 frame; height decides for a portrait in a 16:9 frame.
    expect(coverScale(landscape, coverFrame)).toBe(0.08);
    expect(coverScale(portrait, { width: 300, height: 300 })).toBe(0.1);
    expect(coverScale({ width: 1000, height: 100 }, { width: 300, height: 300 })).toBe(3);
  });
});

describe("crop offset", () => {
  it("lets the photo move only as far as it overflows the frame", () => {
    // At zoom 1 the 4:3 photo is 320x240 in a 320x180 frame: 30 px of slack up and down.
    expect(maxCropOffset(landscape, coverFrame, 1)).toEqual({ x: 0, y: 30 });
    // At zoom 2 it is 640x480.
    expect(maxCropOffset(landscape, coverFrame, 2)).toEqual({ x: 160, y: 150 });
    expect(clampCropOffset(landscape, coverFrame, 1, { x: 50, y: -80 })).toEqual({ x: 0, y: -30 });
    expect(clampCropOffset(landscape, coverFrame, 2, { x: -100, y: 40 })).toEqual({ x: -100, y: 40 });
    expect(clampCropOffset(landscape, coverFrame, 2, { x: 500, y: -500 })).toEqual({ x: 160, y: -150 });
  });

  it("clamps the zoom before clamping the offset", () => {
    expect(clampCropOffset(landscape, coverFrame, 0.2, { x: 10, y: 99 })).toEqual({ x: 0, y: 30 });
    expect(maxCropOffset(landscape, coverFrame, 10)).toEqual(maxCropOffset(landscape, coverFrame, 4));
  });
});

describe("crop rect", () => {
  it("crops the middle of the photo when nothing was moved", () => {
    expect(cropRect(landscape, coverFrame, 1, { x: 0, y: 0 })).toEqual({ originX: 0, originY: 375, width: 4000, height: 2250 });
    expect(cropRect(portrait, { width: 300, height: 300 }, 1, { x: 0, y: 0 })).toEqual({ originX: 0, originY: 500, width: 3000, height: 3000 });
  });

  it("follows the photo: moving it down shows its top", () => {
    expect(cropRect(landscape, coverFrame, 1, { x: 0, y: 30 })).toEqual({ originX: 0, originY: 0, width: 4000, height: 2250 });
    expect(cropRect(landscape, coverFrame, 1, { x: 0, y: -30 })).toEqual({ originX: 0, originY: 750, width: 4000, height: 2250 });
  });

  it("zooms into a smaller region and moves it with the photo", () => {
    expect(cropRect(landscape, coverFrame, 2, { x: 0, y: 0 })).toEqual({ originX: 1000, originY: 938, width: 2000, height: 1125 });
    // Moving the photo 160 px right at zoom 2 reaches its left edge.
    expect(cropRect(landscape, coverFrame, 2, { x: 160, y: 150 })).toEqual({ originX: 0, originY: 0, width: 2000, height: 1125 });
    expect(cropRect(landscape, coverFrame, 2, { x: -160, y: -150 })).toEqual({ originX: 2000, originY: 1875, width: 2000, height: 1125 });
  });

  it("never leaves the photo, whatever offset or zoom it gets", () => {
    expect(cropRect(landscape, coverFrame, 40, { x: -9999, y: 9999 })).toEqual({ originX: 3000, originY: 0, width: 1000, height: 563 });
    expect(cropRect(landscape, coverFrame, -3, { x: 9999, y: 9999 })).toEqual({ originX: 0, originY: 0, width: 4000, height: 2250 });
  });

  it("keeps a whole pixel rect for tiny photos", () => {
    expect(cropRect({ width: 3, height: 2 }, { width: 300, height: 300 }, 1, { x: 0, y: 0 })).toEqual({ originX: 1, originY: 0, width: 2, height: 2 });
  });

  it("refuses sizes that cannot be cropped", () => {
    expect(() => cropRect({ width: 0, height: 10 }, coverFrame, 1, { x: 0, y: 0 })).toThrow("INVALID_CROP_SIZE");
    expect(() => cropRect(landscape, { width: 320, height: 0 }, 1, { x: 0, y: 0 })).toThrow("INVALID_CROP_SIZE");
  });
});
