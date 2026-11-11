/**
 * Maps the taste quiz contract into the domain: an unknown status reads as pending and
 * only known question/option pairs of a completed quiz are kept.
 */
import {
  TASTE_QUIZ_QUESTIONS,
  TASTE_QUIZ_STATUSES,
  type TasteQuizSelection,
  type TasteQuizState,
  type TasteQuizStatus,
} from "./tasteQuiz.types";

type TasteQuizStateInput = {
  status: string;
  answers?: Record<string, string> | null;
  shouldPrompt?: boolean | null;
};

function toStatus(value: string): TasteQuizStatus {
  return (TASTE_QUIZ_STATUSES as readonly string[]).includes(value) ? (value as TasteQuizStatus) : "PENDING";
}

function toSelection(answers: Record<string, string>): TasteQuizSelection {
  const selection: Record<string, string> = {};
  for (const question of TASTE_QUIZ_QUESTIONS) {
    const answer = answers[question.key];
    if (answer !== undefined && (question.options as readonly string[]).includes(answer)) {
      selection[question.key] = answer;
    }
  }
  return selection as TasteQuizSelection;
}

export function mapTasteQuizState(dto: TasteQuizStateInput): TasteQuizState {
  const status = toStatus(dto.status);
  return {
    status,
    answers: status === "COMPLETED" && dto.answers ? toSelection(dto.answers) : null,
    shouldPrompt: dto.shouldPrompt === true,
  };
}
