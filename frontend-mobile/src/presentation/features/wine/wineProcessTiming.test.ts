import {
  AI_PROFILE_JOURNEY_MINIMUM_DURATION_MS,
  FINAL_STAGE_MINIMUM_DURATION_MS,
  AI_PROFILE_STAGE_INTERVAL_MS,
  WINE_COMPARISON_JOURNEY_MINIMUM_DURATION_MS,
  WINE_COMPARISON_STAGE_INTERVAL_MS,
} from "./wineProcessTiming";
import { SCENE_ACTION_MS } from "./WineProcessScene";

/** Typical answer times: AI profile about 10.4 s, comparison about 11 s. */
const PROFILE_ANSWER_MS = 10_400;
const COMPARISON_ANSWER_MS = 11_000;

describe("wine process timing", () => {
  it("gives every stage about two seconds and keeps the wait within the usual answer time", () => {
    expect(AI_PROFILE_STAGE_INTERVAL_MS).toBeGreaterThanOrEqual(1800);
    expect(WINE_COMPARISON_STAGE_INTERVAL_MS).toBeGreaterThanOrEqual(2000);
    expect(AI_PROFILE_JOURNEY_MINIMUM_DURATION_MS).toBeLessThanOrEqual(PROFILE_ANSWER_MS);
    expect(WINE_COMPARISON_JOURNEY_MINIMUM_DURATION_MS).toBeLessThanOrEqual(COMPARISON_ANSWER_MS);
  });

  it("keeps the last stage on screen until the note is fully written", () => {
    expect(FINAL_STAGE_MINIMUM_DURATION_MS).toBeGreaterThan(SCENE_ACTION_MS.report);
    expect(FINAL_STAGE_MINIMUM_DURATION_MS).toBeGreaterThan(SCENE_ACTION_MS.recommendation);
  });

  it("finishes each gesture before its stage gives way to the next one", () => {
    (["uncork", "visual", "bouquet", "taste"] as const).forEach((scene) =>
      expect(SCENE_ACTION_MS[scene]).toBeLessThan(AI_PROFILE_STAGE_INTERVAL_MS),
    );
    (["compare", "structure", "contrast"] as const).forEach((scene) =>
      expect(SCENE_ACTION_MS[scene]).toBeLessThan(WINE_COMPARISON_STAGE_INTERVAL_MS),
    );
  });
});
