/**
 * useRegions — fetch regions reference data
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { regionsService, type Region } from '@services/regions.service'

export function useRegions() {
  return useQuery<Region[]>({
    queryKey: queryKeys.regions.list(),
    queryFn: () => regionsService.getRegions(),
    staleTime: 1000 * 60 * 30, // 30 min — reference data
  })
}

