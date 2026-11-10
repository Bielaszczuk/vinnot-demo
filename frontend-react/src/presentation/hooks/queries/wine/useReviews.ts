/**
 * useReviews — paginated wine reviews query
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { winesService, type WineReviewsResult } from '@services/wines.service'

export function useReviews(
  wineId: string | undefined,
  page = 0,
  pageSize = 10,
  filter: 'recent' | 'popular' | 'mine' = 'recent',
) {
  return useQuery<WineReviewsResult>({
    queryKey: queryKeys.wines.reviews(wineId!, page, filter),
    queryFn: () => winesService.getWineReviews(wineId!, page, pageSize, filter),
    enabled: !!wineId,
    placeholderData: filter === 'mine' ? undefined : keepPreviousData,
  })
}
