/**
 * useCountries — fetch countries reference data
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { regionsService, type Country } from '@services/regions.service'

export function useCountries() {
  return useQuery<Country[]>({
    queryKey: queryKeys.regions.countries(),
    queryFn: () => regionsService.getCountries(),
    staleTime: 1000 * 60 * 30, // 30 min — reference data
  })
}
