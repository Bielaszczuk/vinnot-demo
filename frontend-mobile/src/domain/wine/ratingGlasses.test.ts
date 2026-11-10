import { RATING_MAX, RATING_MIN, ratingGlassFills, snapRating, stepRating } from "./ratingGlasses";

describe("ratingGlassFills", () => {
  it("fills each glass by its fraction: 2.2 is two full glasses and a fifth of the third", () => {
    expect(ratingGlassFills(2.2)).toEqual([1, 1, 0.2, 0, 0]);
  });

  it("keeps whole ratings as full glasses", () => {
    expect(ratingGlassFills(3)).toEqual([1, 1, 1, 0, 0]);
    expect(ratingGlassFills(5)).toEqual([1, 1, 1, 1, 1]);
  });

  it("does not round decimals to halves", () => {
    expect(ratingGlassFills(3.2)).toEqual([1, 1, 1, 0.2, 0]);
    expect(ratingGlassFills(4.8)).toEqual([1, 1, 1, 1, 0.8]);
    expect(ratingGlassFills(4.33)).toEqual([1, 1, 1, 1, 0.33]);
  });

  it("keeps the count inside the scale", () => {
    expect(ratingGlassFills(-1)).toEqual([0, 0, 0, 0, 0]);
    expect(ratingGlassFills(9)).toEqual([1, 1, 1, 1, 1]);
    expect(ratingGlassFills(null)).toEqual([0, 0, 0, 0, 0]);
  });

  it("supports a shorter scale", () => {
    expect(ratingGlassFills(4.5, 1)).toEqual([1]);
  });
});

describe("snapRating", () => {
  it("enters 2.15 as 2.2 and keeps one decimal", () => {
    expect(snapRating(2.15)).toBe(2.2);
    expect(snapRating(3.64)).toBe(3.6);
    expect(snapRating(1.05)).toBe(1.1);
  });

  it("clamps to the 0.1–5.0 scale", () => {
    expect(snapRating(0)).toBe(RATING_MIN);
    expect(snapRating(-3)).toBe(0.1);
    expect(snapRating(5.4)).toBe(RATING_MAX);
  });

  it("steps by a tenth from an empty rating", () => {
    expect(stepRating(0, 1)).toBe(0.1);
    expect(stepRating(3.6, 1)).toBe(3.7);
    expect(stepRating(3.6, -1)).toBe(3.5);
    expect(stepRating(5, 1)).toBe(5);
    expect(stepRating(0.1, -1)).toBe(0.1);
  });
});
