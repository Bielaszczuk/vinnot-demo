/**
 * useWine — single wine detail query
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { winesService } from '@services/wines.service'
import type { Wine } from '@domain/wine/wine.types'

export function useWine(id: string | undefined) {
  return useQuery<Wine>({
    queryKey: queryKeys.wines.detail(id!),
    queryFn: () => winesService.getWine(id!),
    enabled: !!id,
  })
}

