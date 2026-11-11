import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { returnSearchFor } from '@domain/user/returnPath'
import { useAuth } from '@hooks/useAuth'
import { useTasteQuiz } from '@hooks/queries/user/useTasteQuiz'
import { tasteQuizPromptSession } from '@stores/tasteQuizPromptSession'

export const TASTE_QUIZ_PATH = '/taste-quiz'
/** Error and service-state pages are never interrupted. */
const QUIET_PATH = /^\/(403|404|429|500|503|offline|timeout)(\/|$)/

/**
 * After sign-in, takes a member whose quiz the server says to offer (`shouldPrompt`) to the taste quiz once,
 * remembering the page they were on. Never twice in one session; never from pages the caller disables
 * (public, legal), and never without a finished session (terms and onboarding are gated before this runs).
 */
export function useTasteQuizPrompt(disabled: boolean) {
  const { user, isAuthenticated, isInitializing } = useAuth()
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  const userId = user?.id
  const eligible = !disabled
    && isAuthenticated
    && !isInitializing
    && Boolean(userId)
    && user?.onboardingCompleted !== false
    && pathname !== TASTE_QUIZ_PATH
    && !QUIET_PATH.test(pathname)
    && !tasteQuizPromptSession.wasPrompted(userId as string)
  const quiz = useTasteQuiz(eligible)
  const shouldPrompt = eligible && quiz.data?.shouldPrompt === true

  useEffect(() => {
    if (!shouldPrompt || !userId) return
    tasteQuizPromptSession.markPrompted(userId)
    navigate(`${TASTE_QUIZ_PATH}${returnSearchFor(`${pathname}${search}${hash}`)}`)
  }, [hash, navigate, pathname, search, shouldPrompt, userId])
}
