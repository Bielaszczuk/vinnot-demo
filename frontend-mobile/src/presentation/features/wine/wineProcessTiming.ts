/** The last stage stays at least long enough for the note to be written in full. */
export const FINAL_STAGE_MINIMUM_DURATION_MS = 3200;

/**
 * Time on screen for each stage. The AI profile answers in about 10.4 s over five stages and the
 * comparison in about 11 s over four, so the shortest journey matches those times: the last stage
 * (the note being written) starts before the answer arrives and each gesture plays calmly.
 */
export const AI_PROFILE_STAGE_INTERVAL_MS = 1800;
export const WINE_COMPARISON_STAGE_INTERVAL_MS = 2500;

function minimumJourneyDuration(stepCount: number, intervalMs: number): number {
  const transitionsBeforeFinalStage = Math.max(stepCount - 1, 0);
  return transitionsBeforeFinalStage * intervalMs + FINAL_STAGE_MINIMUM_DURATION_MS;
}

export const AI_PROFILE_JOURNEY_MINIMUM_DURATION_MS = minimumJourneyDuration(
  5,
  AI_PROFILE_STAGE_INTERVAL_MS,
);
export const WINE_COMPARISON_JOURNEY_MINIMUM_DURATION_MS = minimumJourneyDuration(
  4,
  WINE_COMPARISON_STAGE_INTERVAL_MS,
);
