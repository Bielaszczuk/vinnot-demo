/**
 * useDeleteReviewComment — remove a comment from a review
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { invalidateMyPoints } from '@hooks/queries/user/pointsCache'
import { winesService } from '@services/wines.service'

interface DeleteReviewCommentVars {
  wineId: string
  reviewId: string
  commentId: string
}

export function useDeleteReviewComment() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DeleteReviewCommentVars>({
    mutationFn: ({ wineId, reviewId, commentId }) =>
      winesService.deleteReviewComment(wineId, reviewId, commentId),
    onSuccess: (_data, { wineId, reviewId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.wines.reviewComments(wineId, reviewId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.detail(wineId) })
      invalidateMyPoints(queryClient)
    },
  })
}

