/**
 * useWineRoute — single wine route detail query
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { wineRoutesService } from '@services/wineRoutes.service'
import type { WineRoute } from '@domain/route/route.types'

export function useWineRoute(id: string | undefined) {
  return useQuery<WineRoute>({
    queryKey: queryKeys.wineRoutes.detail(id!),
    queryFn: () => wineRoutesService.getWineRoute(id!),
    enabled: !!id,
  })
}

