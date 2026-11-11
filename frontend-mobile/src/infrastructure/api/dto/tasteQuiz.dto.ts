/**
 * Taste quiz contract (issue #541, S10).
 * GET /users/me/taste-quiz answers inside `{ data, timestamp }`; PUT and POST skip answer 204.
 */
export interface TasteQuizDto {
  status: "PENDING" | "COMPLETED" | "SKIPPED";
  /** Question key -> option key; only when COMPLETED. */
  answers: Record<string, string> | null;
  shouldPrompt: boolean;
}

/** PUT /users/me/taste-quiz: all five question keys (400 INVALID_TASTE_QUIZ otherwise). */
export interface TasteQuizAnswersRequestDto {
  answers: Record<string, string>;
}
