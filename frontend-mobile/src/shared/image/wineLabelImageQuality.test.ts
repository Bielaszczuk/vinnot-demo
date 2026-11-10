import {
  assertUsableWineLabelImage,
  measureWineLabelImageQuality,
  WineLabelImageQualityError,
} from "./wineLabelImageQuality";

function solidPixels(width: number, height: number, value: number): Uint8Array {
  const pixels = new Uint8Array(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
    pixels[index + 3] = 255;
  }
  return pixels;
}

describe("wine-label image quality", () => {
  it("measures luminance and horizontal detail from RGBA pixels", () => {
    const pixels = new Uint8Array([
      0, 0, 0, 255,
      255, 255, 255, 255,
      0, 0, 0, 255,
      255, 255, 255, 255,
    ]);

    const quality = measureWineLabelImageQuality(pixels, 2, 2);

    expect(quality.meanLuminance).toBeCloseTo(127.5);
    expect(quality.edgeEnergy).toBeCloseTo(255);
  });

  it.each([
    [{ meanLuminance: 5, edgeEnergy: 10, width: 800, height: 1000 }, "LABEL_IMAGE_TOO_DARK"],
    [{ meanLuminance: 250, edgeEnergy: 10, width: 800, height: 1000 }, "LABEL_IMAGE_TOO_BRIGHT"],
    [{ meanLuminance: 120, edgeEnergy: 0.5, width: 800, height: 1000 }, "LABEL_IMAGE_OUT_OF_FOCUS"],
    [{ meanLuminance: 120, edgeEnergy: 10, width: 300, height: 700 }, "LABEL_IMAGE_RESOLUTION_TOO_LOW"],
  ] as const)("rejects unusable quality with %s", (quality, expectedCode) => {
    expect(() => assertUsableWineLabelImage(quality)).toThrow(
      expect.objectContaining<Partial<WineLabelImageQualityError>>({ code: expectedCode }),
    );
  });

  it("accepts a readable, detailed label", () => {
    const quality = measureWineLabelImageQuality(solidPixels(2, 2, 120), 2, 2);

    expect(() => assertUsableWineLabelImage({
      ...quality,
      edgeEnergy: 12,
      width: 800,
      height: 1200,
    })).not.toThrow();
  });
});
