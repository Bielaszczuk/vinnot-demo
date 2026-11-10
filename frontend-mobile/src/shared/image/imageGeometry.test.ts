import {
  calculateAspectFillImageCrop,
  calculateConstrainedResize,
  calculateImageCrop,
} from "./imageGeometry";

describe("imageGeometry", () => {
  it("maps the normalized guide to oriented camera pixels", () => {
    expect(
      calculateImageCrop(
        { width: 3000, height: 4000 },
        { originX: 0.06, originY: 0.14, width: 0.88, height: 0.63 },
      ),
    ).toEqual({
      originX: 180,
      originY: 560,
      width: 2640,
      height: 2520,
    });
  });

  it("constrains only the long edge while preserving aspect ratio", () => {
    expect(calculateConstrainedResize({ width: 2640, height: 2520 }, 1600)).toEqual({
      width: 1600,
    });
    expect(calculateConstrainedResize({ width: 900, height: 1200 }, 1600)).toBeNull();
  });

  it("accounts for the source area clipped by an aspect-fill preview", () => {
    expect(
      calculateAspectFillImageCrop(
        { width: 3000, height: 4000 },
        { width: 1000, height: 1000 },
        { originX: 0.06, originY: 0.14, width: 0.88, height: 0.63 },
      ),
    ).toEqual({
      originX: 180,
      originY: 919,
      width: 2640,
      height: 1891,
    });
  });

  it("rejects regions outside the camera preview", () => {
    expect(() =>
      calculateImageCrop(
        { width: 3000, height: 4000 },
        { originX: 0.5, originY: 0.2, width: 0.6, height: 0.7 },
      ),
    ).toThrow("Normalized image region must fit inside its source");
  });
});
