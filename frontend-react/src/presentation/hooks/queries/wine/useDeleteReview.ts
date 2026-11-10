/**
 * useDeleteReview — delete a wine review mutation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { invalidateMyPoints } from '@hooks/queries/user/pointsCache'
import { winesService } from '@services/wines.service'

interface DeleteReviewVars {
  wineId: string
  reviewId: string
}

export function useDeleteReview() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DeleteReviewVars>({
    mutationFn: ({ wineId, reviewId }) =>
      winesService.deleteReview(wineId, reviewId),
    onSuccess: (_data, { wineId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.detail(wineId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.lists() })
      void queryClient.invalidateQueries({ queryKey: ['community'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cellar.all })
      invalidateMyPoints(queryClient)
    },
  })
}
