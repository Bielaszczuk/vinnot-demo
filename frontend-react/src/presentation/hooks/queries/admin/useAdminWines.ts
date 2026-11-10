/**
 * useAdminWines — paginated admin wine list query
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminPaginatedResult, AdminWine } from '@domain/admin/admin.types'

export function useAdminWines(page: number, size: number, search?: string) {
  return useQuery<AdminPaginatedResult<AdminWine>>({
    queryKey: queryKeys.admin.wines.list({ page, size, search }),
    queryFn: () => adminService.getWines(page, size, search),
    placeholderData: keepPreviousData,
  })
}

export function useAdminWineDetail(id: string | undefined) {
  return useQuery<AdminWine>({
    queryKey: queryKeys.admin.wines.detail(id ?? ''),
    queryFn: () => adminService.getWine(id!),
    enabled: !!id,
  })
}

