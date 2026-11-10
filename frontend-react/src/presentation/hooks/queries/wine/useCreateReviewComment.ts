/**
 * useCreateReviewComment — add a comment to a review
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { invalidateMyPoints } from '@hooks/queries/user/pointsCache'
import { winesService } from '@services/wines.service'
import type { WineReviewComment } from '@domain/wine/wine.types'

interface CreateReviewCommentVars {
  wineId: string
  reviewId: string
  content: string
}

export function useCreateReviewComment() {
  const queryClient = useQueryClient()

  return useMutation<WineReviewComment, Error, CreateReviewCommentVars>({
    mutationFn: ({ wineId, reviewId, content }) =>
      winesService.addReviewComment(wineId, reviewId, content),
    onSuccess: (_data, { wineId, reviewId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.wines.reviewComments(wineId, reviewId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.detail(wineId) })
      invalidateMyPoints(queryClient)
    },
  })
}

