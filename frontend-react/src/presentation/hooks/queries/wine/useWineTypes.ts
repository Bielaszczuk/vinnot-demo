/**
 * useWineTypes — active wine types from the reference catalog
 *
 * Follows architecture: hook → service → client (no direct http access).
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { referenceDataService } from '@services/referenceData.service'
import type { WineTypeOption } from '@domain/wine/wine.types'

export function useWineTypes() {
  return useQuery<WineTypeOption[]>({
    queryKey: queryKeys.wines.wineTypes(),
    queryFn: () => referenceDataService.getWineTypes(),
    staleTime: 1000 * 60 * 30, // 30 min — reference data
  })
}
