/**
 * Taste quiz domain types: five illustrated questions that seed a member's taste profile.
 * The member only sees each option's art and label; how an answer shapes the profile stays on the server.
 */

/** The questions in the order the quiz asks them, each with its options in display order. */
export const TASTE_QUIZ_QUESTIONS = [
  { key: 'RAINY_DAY', options: ['DARK_CHOCOLATE_COFFEE', 'SPICED_TEA_APPLE_TART'] },
  { key: 'FRUIT', options: ['CITRUS', 'RED_BERRIES', 'DARK_BERRIES', 'STONE_TROPICAL'] },
  { key: 'DESSERT', options: ['LEMON_TART', 'CARAMEL_FLAN', 'BROWNIE', 'FRESH_FRUIT'] },
  { key: 'DINNER', options: ['GRILLED_RED_MEAT', 'LEMON_FISH', 'MUSHROOM_PASTA', 'SPICY_CURRY'] },
  { key: 'AROMA', options: ['VANILLA_TOAST', 'PEPPER_CINNAMON', 'ROSES_VIOLETS', 'CUT_GRASS'] },
] as const

export type TasteQuizQuestion = (typeof TASTE_QUIZ_QUESTIONS)[number]
export type TasteQuizQuestionKey = TasteQuizQuestion['key']
export type TasteQuizOptionKey = TasteQuizQuestion['options'][number]

/** One chosen option per question. */
export type TasteQuizAnswers = Record<TasteQuizQuestionKey, TasteQuizOptionKey>

/** Answers while the member is still going through the quiz. */
export type TasteQuizDraft = Partial<TasteQuizAnswers>

export const TASTE_QUIZ_STATUSES = ['PENDING', 'COMPLETED', 'SKIPPED'] as const
export type TasteQuizStatus = (typeof TASTE_QUIZ_STATUSES)[number]

/** The member's quiz: whether it was answered or skipped, and whether to offer it after sign-in. */
export interface TasteQuiz {
  status: TasteQuizStatus
  /** Only present when the quiz is completed. */
  answers: TasteQuizAnswers | null
  shouldPrompt: boolean
}
