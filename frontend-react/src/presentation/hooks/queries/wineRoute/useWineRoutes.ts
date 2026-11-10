/**
 * useWineRoutes — paginated wine route list query
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { wineRoutesService, type WineRoutesResult } from '@services/wineRoutes.service'
import type { WineRouteFilter } from '@domain/route/route.types'

export function useWineRoutes(filter?: WineRouteFilter, page = 0, pageSize = 20) {
  return useQuery<WineRoutesResult>({
    queryKey: queryKeys.wineRoutes.list({ ...filter, page, pageSize }),
    queryFn: () => wineRoutesService.getWineRoutes(filter, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

