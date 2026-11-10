/**
 * useAdminWineries — paginated admin winery list query
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminPaginatedResult, AdminWinery } from '@domain/admin/admin.types'

export function useAdminWineries(
  page: number,
  size: number,
  search?: string,
  country?: string,
  region?: string,
) {
  return useQuery<AdminPaginatedResult<AdminWinery>>({
    queryKey: queryKeys.admin.wineries.list({ page, size, search, country, region }),
    queryFn: () => adminService.getWineries(page, size, search, country, region),
    placeholderData: keepPreviousData,
  })
}
