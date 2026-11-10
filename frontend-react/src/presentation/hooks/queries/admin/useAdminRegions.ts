/**
 * useAdminCountries / useAdminRegions — region select queries for admin forms
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminCountry, AdminRegion } from '@domain/admin/admin.types'

export function useAdminCountries() {
  return useQuery<AdminCountry[]>({
    queryKey: queryKeys.admin.countries(),
    queryFn: () => adminService.getCountries(),
    staleTime: 1000 * 60 * 30, // 30 min cache
  })
}

export function useAdminRegions(countryId: string | null) {
  return useQuery<AdminRegion[]>({
    queryKey: queryKeys.admin.regions(countryId ?? ''),
    queryFn: () => adminService.getRegionsByCountry(countryId!),
    enabled: !!countryId,
  })
}

