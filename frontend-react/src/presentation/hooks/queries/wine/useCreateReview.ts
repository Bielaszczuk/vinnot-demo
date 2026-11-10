/**
 * useCreateReview — create a wine review mutation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { invalidateMyPoints } from '@hooks/queries/user/pointsCache'
import { winesService } from '@services/wines.service'
import type { WineReview } from '@domain/wine/wine.types'

interface CreateReviewVars {
  wineId: string
  rating: number
  title?: string
  comment?: string
  vintage?: number | null
}

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation<WineReview, Error, CreateReviewVars>({
    mutationFn: ({ wineId, rating, title, comment, vintage }) =>
      winesService.addReview(wineId, rating, title, comment, vintage),
    onSuccess: (_data, { wineId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.detail(wineId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.lists() })
      void queryClient.invalidateQueries({ queryKey: ['community'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cellar.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.myStats() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.reviews.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
      invalidateMyPoints(queryClient)
    },
  })
}
