/**
 * useWineryWines — wines belonging to a specific winery
 *
 * Fetches wines filtered by wineryId using the wines API endpoint.
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { wineriesService } from '@services/wineries.service'
import type { WineryWinesResult } from '@services/wineries.service'

export function useWineryWines(wineryId: string | undefined, page = 0, pageSize = 20) {
  return useQuery<WineryWinesResult>({
    queryKey: queryKeys.wineries.wines(wineryId!, { page, pageSize }),
    queryFn: () => wineriesService.getWineryWines(wineryId!, page, pageSize),
    enabled: !!wineryId,
    placeholderData: keepPreviousData,
  })
}

