/**
 * useToggleReviewLike — toggle helpful/like on a wine review
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { invalidateMyPoints } from '@hooks/queries/user/pointsCache'
import { winesService } from '@services/wines.service'

interface ToggleReviewLikeVars {
  wineId: string
  reviewId: string
  liked: boolean
}

export function useToggleReviewLike() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, ToggleReviewLikeVars>({
    mutationFn: async ({ wineId, reviewId, liked }) => {
      if (liked) {
        await winesService.unmarkReviewHelpful(wineId, reviewId)
      } else {
        await winesService.markReviewHelpful(wineId, reviewId)
      }
    },
    onSuccess: (_data, { wineId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.detail(wineId) })
      // A like on one's own review counts too.
      invalidateMyPoints(queryClient)
    },
  })
}

