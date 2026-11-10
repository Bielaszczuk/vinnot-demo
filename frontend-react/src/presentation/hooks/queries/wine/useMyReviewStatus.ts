/**
 * useMyReviewStatus — check whether current user has already reviewed a wine
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { winesService } from '@services/wines.service'

export function useMyReviewStatus(wineId: string | undefined, enabled = true, refreshOnMount = false) {
  return useQuery<{ hasReview: boolean }>({
    queryKey: queryKeys.wines.myReview(wineId!),
    queryFn: () => winesService.getMyReviewStatus(wineId!),
    enabled: !!wineId && enabled,
    refetchOnMount: refreshOnMount ? 'always' : undefined,
  })
}
