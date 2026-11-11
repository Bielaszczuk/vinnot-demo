/**
 * Taste quiz domain: five illustrated questions that seed a new member's taste profile.
 * Members only see the options; how each answer shapes the profile stays on the server.
 * @contract: GET/PUT /users/me/taste-quiz and POST /users/me/taste-quiz/skip (issue #541, S10).
 */

/** The questions in their fixed order, each with its options in display order. */
export const TASTE_QUIZ_QUESTIONS = [
  { key: "RAINY_DAY", options: ["DARK_CHOCOLATE_COFFEE", "SPICED_TEA_APPLE_TART"] },
  { key: "FRUIT", options: ["CITRUS", "RED_BERRIES", "DARK_BERRIES", "STONE_TROPICAL"] },
  { key: "DESSERT", options: ["LEMON_TART", "CARAMEL_FLAN", "BROWNIE", "FRESH_FRUIT"] },
  { key: "DINNER", options: ["GRILLED_RED_MEAT", "LEMON_FISH", "MUSHROOM_PASTA", "SPICY_CURRY"] },
  { key: "AROMA", options: ["VANILLA_TOAST", "PEPPER_CINNAMON", "ROSES_VIOLETS", "CUT_GRASS"] },
] as const;

export type TasteQuizQuestion = (typeof TASTE_QUIZ_QUESTIONS)[number];
export type TasteQuizQuestionKey = TasteQuizQuestion["key"];
export type TasteQuizOptionKey = TasteQuizQuestion["options"][number];

/** Every option key, in question order: one illustration each. */
export const TASTE_QUIZ_OPTION_KEYS: readonly TasteQuizOptionKey[] = TASTE_QUIZ_QUESTIONS.flatMap(
  (question) => question.options,
);

/** One answer per question, each an option of that question. */
export type TasteQuizAnswers = {
  [Q in TasteQuizQuestion as Q["key"]]: Q["options"][number];
};

/** Answers given so far, while the member is going through the quiz. */
export type TasteQuizSelection = Partial<TasteQuizAnswers>;

export const TASTE_QUIZ_STATUSES = ["PENDING", "COMPLETED", "SKIPPED"] as const;
export type TasteQuizStatus = (typeof TASTE_QUIZ_STATUSES)[number];

export interface TasteQuizState {
  status: TasteQuizStatus;
  /** Only for a completed quiz. */
  answers: TasteQuizSelection | null;
  /** The server asks the app to offer the quiz after sign-in. */
  shouldPrompt: boolean;
}
