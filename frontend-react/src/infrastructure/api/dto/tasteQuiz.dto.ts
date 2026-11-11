/** GET /users/me/taste-quiz `data`. `answers` is only present when the status is COMPLETED. */
export interface TasteQuizDto {
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED'
  answers: Record<string, string> | null
  /** Offer the quiz after sign-in: pending and fewer than 5 rated wines. */
  shouldPrompt: boolean
}

/** PUT /users/me/taste-quiz body: one option key per question key (RAINY_DAY, FRUIT, DESSERT, DINNER, AROMA). */
export interface CompleteTasteQuizRequestDto {
  answers: Record<string, string>
}
