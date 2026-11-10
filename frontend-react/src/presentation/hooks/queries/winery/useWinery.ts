/**
 * useWinery — single winery detail query
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { wineriesService } from '@services/wineries.service'
import type { Winery } from '@domain/winery/winery.types'

export function useWinery(id: string | undefined) {
  return useQuery<Winery>({
    queryKey: queryKeys.wineries.detail(id!),
    queryFn: () => wineriesService.getWinery(id!),
    enabled: !!id,
  })
}

