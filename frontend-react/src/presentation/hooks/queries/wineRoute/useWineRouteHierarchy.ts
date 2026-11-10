/**
 * useWineRouteHierarchy — hierarchy query for country/region filter dropdowns
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { wineRoutesService } from '@services/wineRoutes.service'
import type { WineRouteHierarchy } from '@domain/route/route.types'

export function useWineRouteHierarchy() {
  return useQuery<WineRouteHierarchy>({
    queryKey: queryKeys.wineRoutes.hierarchy(),
    queryFn: () => wineRoutesService.getHierarchy(),
    staleTime: 10 * 60 * 1000, // 10 min — hierarchy rarely changes
  })
}

