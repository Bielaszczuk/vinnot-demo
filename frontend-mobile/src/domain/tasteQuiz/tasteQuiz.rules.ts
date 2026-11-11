import {
  TASTE_QUIZ_QUESTIONS,
  type TasteQuizAnswers,
  type TasteQuizOptionKey,
  type TasteQuizSelection,
} from "./tasteQuiz.types";

/** The five answers ready to send, or null while a question is still unanswered. */
export function completeTasteQuizAnswers(selection: TasteQuizSelection): TasteQuizAnswers | null {
  return TASTE_QUIZ_QUESTIONS.every((question) => selection[question.key] !== undefined)
    ? (selection as TasteQuizAnswers)
    : null;
}

/** The options picked so far, in question order: the finish animation draws them. */
export function tasteQuizPicks(selection: TasteQuizSelection): TasteQuizOptionKey[] {
  return TASTE_QUIZ_QUESTIONS.flatMap((question) => {
    const pick = selection[question.key];
    return pick ? [pick] : [];
  });
}
