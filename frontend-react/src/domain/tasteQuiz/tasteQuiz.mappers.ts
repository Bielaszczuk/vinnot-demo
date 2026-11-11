import {
  TASTE_QUIZ_QUESTIONS,
  TASTE_QUIZ_STATUSES,
  type TasteQuiz,
  type TasteQuizAnswers,
  type TasteQuizStatus,
} from './tasteQuiz.types'

type TasteQuizInput = {
  status: string
  answers?: Record<string, string> | null
  shouldPrompt?: boolean | null
}

function parseStatus(value: string): TasteQuizStatus {
  return (TASTE_QUIZ_STATUSES as readonly string[]).includes(value) ? (value as TasteQuizStatus) : 'PENDING'
}

/** The five answers when every question has one of its own options; otherwise null. */
export function completeTasteQuizAnswers(draft: Partial<Record<string, string>>): TasteQuizAnswers | null {
  const complete = TASTE_QUIZ_QUESTIONS.every((question) => (question.options as readonly string[]).includes(draft[question.key] ?? ''))
  if (!complete) return null
  return Object.fromEntries(TASTE_QUIZ_QUESTIONS.map((question) => [question.key, draft[question.key]])) as TasteQuizAnswers
}

/** Unknown statuses read as pending; answers only travel with a completed quiz this version understands. */
export function mapTasteQuiz(raw: TasteQuizInput): TasteQuiz {
  const status = parseStatus(raw.status)
  return {
    status,
    answers: status === 'COMPLETED' && raw.answers ? completeTasteQuizAnswers(raw.answers) : null,
    shouldPrompt: raw.shouldPrompt ?? false,
  }
}
