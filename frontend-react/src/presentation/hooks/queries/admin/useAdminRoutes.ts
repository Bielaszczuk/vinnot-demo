/**
 * useAdminRoutes — paginated admin route list and detail queries
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminPaginatedResult, AdminRoute } from '@domain/admin/admin.types'

export function useAdminRoutes(page: number, size: number, search?: string) {
  return useQuery<AdminPaginatedResult<AdminRoute>>({
    queryKey: queryKeys.admin.routes.list({ page, size, search }),
    queryFn: () => adminService.getRoutes(page, size, search),
    placeholderData: keepPreviousData,
  })
}

export function useAdminRouteDetail(id: string | undefined) {
  return useQuery<AdminRoute>({
    queryKey: queryKeys.admin.routes.detail(id ?? ''),
    queryFn: () => adminService.getRoute(id!),
    enabled: !!id,
  })
}

