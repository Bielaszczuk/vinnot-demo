/**
 * Taste quiz hooks: the signed-in member's quiz status, completing it and skipping it.
 * Flow: page → hook → service → client → http
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { tasteQuizService } from '@services/tasteQuiz.service'
import { useAuth } from '@hooks/useAuth'
import type { TasteQuiz, TasteQuizAnswers } from '@domain/tasteQuiz/tasteQuiz.types'

export function useTasteQuiz(enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.tasteQuiz(),
    queryFn: () => tasteQuizService.get(),
    enabled,
  })
}

/** Saves the answers, then refreshes the quiz status and the member's own profile, whose taste card now reflects them. */
export function useCompleteTasteQuiz() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation<void, Error, TasteQuizAnswers>({
    mutationFn: (answers) => tasteQuizService.complete(answers),
    onSuccess: (_result, answers) => {
      queryClient.setQueryData<TasteQuiz>(queryKeys.users.tasteQuiz(), { status: 'COMPLETED', answers, shouldPrompt: false })
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.tasteQuiz() })
      if (user) void queryClient.invalidateQueries({ queryKey: queryKeys.social.profile(user.id) })
    },
  })
}

/** Records the skip; the quiz is not offered after sign-in again. */
export function useSkipTasteQuiz() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: () => tasteQuizService.skip(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.tasteQuiz() })
    },
  })
}
