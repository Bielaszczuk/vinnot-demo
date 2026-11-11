import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { completeTasteQuizAnswers } from '@domain/tasteQuiz/tasteQuiz.mappers'
import { TASTE_QUIZ_QUESTIONS, type TasteQuizAnswers, type TasteQuizDraft, type TasteQuizOptionKey } from '@domain/tasteQuiz/tasteQuiz.types'
import { internalReturnPath } from '@domain/user/returnPath'
import { useAuth } from '@hooks/useAuth'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { useCompleteTasteQuiz, useSkipTasteQuiz, useTasteQuiz } from '@hooks/queries/user/useTasteQuiz'
import { TASTE_QUIZ_PATH } from '@hooks/useTasteQuizPrompt'

/** The beat between tapping an option and the next question, so the highlight is seen. */
export const TASTE_QUIZ_ADVANCE_MS = 450
const REDUCED_MOTION_ADVANCE_MS = 200
/**
 * The profile animation stays at least this long, even when the answers are saved sooner: the four scenes
 * play at a calm pace and the finished wheel rests a moment before the profile opens.
 */
export const TASTE_QUIZ_MIN_ANIMATION_MS = 13400

export type TasteQuizPhase = 'answering' | 'saving' | 'error'

const wait = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms) })

/** Where Skip goes back to: the page the member came from, Home when unknown, never the quiz itself. */
function returnDestination(requested: string | null): string {
  const target = internalReturnPath(requested)
  return target.startsWith(TASTE_QUIZ_PATH) ? '/' : target
}

/**
 * View model of the taste quiz (/taste-quiz): one question at a time, a short beat after each choice,
 * Back keeping the answers, Skip on every step, and the profile animation while the answers are saved.
 */
export function useTasteQuizViewModel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const reducedMotion = useReducedMotion()
  const quiz = useTasteQuiz()
  const complete = useCompleteTasteQuiz()
  const skipQuiz = useSkipTasteQuiz()

  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<TasteQuizDraft>({})
  const [phase, setPhase] = useState<TasteQuizPhase>('answering')
  const advanceTimer = useRef<number | undefined>(undefined)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(advanceTimer.current)
    }
  }, [])

  const returnTo = returnDestination(params.get('returnUrl'))
  const isRetake = quiz.data?.status === 'COMPLETED'
  const question = TASTE_QUIZ_QUESTIONS[step]!
  const { mutateAsync: saveAnswers } = complete
  const { mutateAsync: recordSkip } = skipQuiz
  /** The options picked so far, in question order: the profile animation draws them. */
  const picks = useMemo(
    () => TASTE_QUIZ_QUESTIONS.flatMap((item): TasteQuizOptionKey[] => {
      const option = draft[item.key]
      return option ? [option] : []
    }),
    [draft],
  )

  const submit = useCallback((answers: TasteQuizAnswers) => {
    setPhase('saving')
    Promise.all([saveAnswers(answers), wait(TASTE_QUIZ_MIN_ANIMATION_MS)])
      .then(() => {
        if (mounted.current) navigate(user ? `/users/${user.id}` : '/', { replace: true })
      })
      .catch(() => {
        if (mounted.current) setPhase('error')
      })
  }, [navigate, saveAnswers, user])

  const select = useCallback((option: TasteQuizOptionKey) => {
    const next = { ...draft, [question.key]: option }
    setDraft(next)
    window.clearTimeout(advanceTimer.current)
    advanceTimer.current = window.setTimeout(() => {
      if (step < TASTE_QUIZ_QUESTIONS.length - 1) {
        setStep(step + 1)
        return
      }
      const answers = completeTasteQuizAnswers(next)
      if (answers) submit(answers)
    }, reducedMotion ? REDUCED_MOTION_ADVANCE_MS : TASTE_QUIZ_ADVANCE_MS)
  }, [draft, question.key, reducedMotion, step, submit])

  const back = useCallback(() => {
    window.clearTimeout(advanceTimer.current)
    setStep((current) => Math.max(0, current - 1))
  }, [])

  const retry = useCallback(() => {
    const answers = completeTasteQuizAnswers(draft)
    if (answers) submit(answers)
  }, [draft, submit])

  /** A retake only leaves: the completed quiz stays. Otherwise the skip is recorded, then the member goes back. */
  const skip = useCallback(() => {
    window.clearTimeout(advanceTimer.current)
    const leave = () => navigate(returnTo, { replace: true })
    if (isRetake) {
      leave()
      return
    }
    recordSkip().catch(() => undefined).finally(leave)
  }, [isRetake, navigate, recordSkip, returnTo])

  return {
    t,
    phase,
    step,
    total: TASTE_QUIZ_QUESTIONS.length,
    question,
    selected: draft[question.key] ?? null,
    picks,
    select,
    back,
    skip,
    skipping: skipQuiz.isPending,
    retry,
  }
}

export type TasteQuizViewModel = ReturnType<typeof useTasteQuizViewModel>
