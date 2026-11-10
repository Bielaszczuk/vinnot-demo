/**
 * useGrapeTypes — fetch grape types reference data
 *
 * Follows architecture: hook → service → client (no direct http access).
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { grapeTypesService, type GrapeType } from '@services/grapeTypes.service'

export function useGrapeTypes() {
  return useQuery<GrapeType[]>({
    queryKey: queryKeys.wines.grapeTypes(),
    queryFn: () => grapeTypesService.getGrapeTypes(),
    staleTime: 1000 * 60 * 30, // 30 min — reference data
  })
}

