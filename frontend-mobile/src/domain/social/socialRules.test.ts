import { describe, expect, it } from "@jest/globals";
import {
  clampTasteTraitValue,
  followersCountShown,
  isCellarHiddenError,
  tasteEditorValues,
  tasteStructureChanges,
  tasteTraitLevel,
  tasteWheelSlicesOf,
  tasteWheelViews,
} from "./socialRules";
import type { TasteSlice, TasteTraitScore } from "./social.types";

describe("socialRules", () => {
  it.each([
    [{ code: "CELLAR_NOT_VISIBLE", status: 403 }, true],
    [{ status: 403 }, true],
    [{ code: "CELLAR_NOT_VISIBLE" }, true],
    [{ code: "NOT_FOUND", status: 404 }, false],
    [null, false],
    ["403", false],
  ])("knows whether %p hides the cellar", (error, hidden) => {
    expect(isCellarHiddenError(error)).toBe(hidden);
  });

  it("moves the followers count by one while a follow change is pending", () => {
    expect(followersCountShown(4, false, false)).toBe(4);
    expect(followersCountShown(4, false, true)).toBe(5);
    expect(followersCountShown(4, true, false)).toBe(3);
    expect(followersCountShown(0, true, false)).toBe(0);
  });

  it.each([
    [0, "LOW"],
    [33, "LOW"],
    [33.9, "LOW"],
    [34, "MEDIUM"],
    [66, "MEDIUM"],
    [66.9, "MEDIUM"],
    [67, "HIGH"],
    [100, "HIGH"],
  ] as const)("reads a %p taste trait score as %s", (score, level) => {
    expect(tasteTraitLevel(score)).toBe(level);
  });

  const structure: TasteTraitScore[] = [
    { trait: "BODY", score: 71.6, wines: 5, adjusted: false },
    { trait: "ACIDITY", score: 30, wines: 4, adjusted: true },
  ];

  it("keeps a manual value a whole number between 0 and 100", () => {
    expect(clampTasteTraitValue(-4)).toBe(0);
    expect(clampTasteTraitValue(42.4)).toBe(42);
    expect(clampTasteTraitValue(130)).toBe(100);
  });

  it("starts the editor from the profile values and the middle for missing traits", () => {
    expect(tasteEditorValues(structure)).toEqual({ ACIDITY: 30, BODY: 72, TANNIN: 50, SWEETNESS: 50 });
  });

  it("saves only touched traits that moved, and a missing trait once touched", () => {
    const values = { ACIDITY: 45, BODY: 72, TANNIN: 50, SWEETNESS: 60 };
    expect(tasteStructureChanges(structure, values, new Set(["ACIDITY", "BODY", "TANNIN"]))).toEqual({
      ACIDITY: 45,
      TANNIN: 50,
    });
    expect(tasteStructureChanges(structure, values, new Set())).toEqual({});
  });

  const wheelSlice = (kind: TasteSlice["kind"], value: string): TasteSlice => ({
    kind,
    value,
    label: value,
    score: 4,
    tone: null,
    ratedWines: 1,
  });

  it("offers the wheel views that have entries, grapes first", () => {
    const wheel = [wheelSlice("REGION", "mendoza"), wheelSlice("TYPE", "RED"), wheelSlice("GRAPE", "malbec")];
    expect(tasteWheelViews(wheel)).toEqual(["GRAPE", "TYPE", "REGION"]);
  });

  it("hides an empty view, so the first view with entries comes first", () => {
    expect(tasteWheelViews([wheelSlice("REGION", "mendoza"), wheelSlice("TYPE", "RED")])).toEqual(["TYPE", "REGION"]);
    expect(tasteWheelViews([])).toEqual([]);
  });

  it("keeps one kind per view, in the order sent", () => {
    const wheel = [wheelSlice("GRAPE", "malbec"), wheelSlice("TYPE", "RED"), wheelSlice("GRAPE", "syrah")];
    expect(tasteWheelSlicesOf(wheel, "GRAPE").map((slice) => slice.value)).toEqual(["malbec", "syrah"]);
    expect(tasteWheelSlicesOf(wheel, "REGION")).toEqual([]);
  });
});
