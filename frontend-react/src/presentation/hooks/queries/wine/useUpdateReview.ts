/**
 * useUpdateReview — update a wine review mutation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { invalidateMyPoints } from '@hooks/queries/user/pointsCache'
import { winesService } from '@services/wines.service'
import type { WineReview } from '@domain/wine/wine.types'

interface UpdateReviewVars {
  wineId: string
  reviewId: string
  rating: number
  title?: string
  comment?: string
  /** A year sets the vintage, `null` clears it, `undefined` keeps the stored one. */
  vintage?: number | null
}

export function useUpdateReview() {
  const queryClient = useQueryClient()

  return useMutation<WineReview, Error, UpdateReviewVars>({
    mutationFn: ({ wineId, reviewId, rating, title, comment, vintage }) =>
      winesService.updateReview(wineId, reviewId, rating, title, comment, vintage),
    onSuccess: (_data, { wineId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.detail(wineId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.lists() })
      void queryClient.invalidateQueries({ queryKey: ['community'] })
      // The review sync copies its vintage into the cellar note.
      void queryClient.invalidateQueries({ queryKey: queryKeys.cellar.all })
      // Editing the note can award or revoke its points.
      invalidateMyPoints(queryClient)
    },
  })
}

