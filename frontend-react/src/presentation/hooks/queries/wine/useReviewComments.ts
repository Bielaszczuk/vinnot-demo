/**
 * useReviewComments — list comments for a review
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { winesService } from '@services/wines.service'
import type { WineReviewComment } from '@domain/wine/wine.types'

export function useReviewComments(wineId: string | undefined, reviewId: string | undefined) {
  return useQuery<WineReviewComment[]>({
    queryKey: queryKeys.wines.reviewComments(wineId!, reviewId!),
    queryFn: () => winesService.getReviewComments(wineId!, reviewId!),
    enabled: !!wineId && !!reviewId,
  })
}

