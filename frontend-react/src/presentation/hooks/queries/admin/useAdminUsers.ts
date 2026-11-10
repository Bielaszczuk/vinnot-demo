/**
 * useAdminUsers — paginated admin user list query
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminPaginatedResult, AdminUser } from '@domain/admin/admin.types'

export function useAdminUsers(page: number, size: number, search?: string) {
  return useQuery<AdminPaginatedResult<AdminUser>>({
    queryKey: queryKeys.admin.users.list({ page, size, search }),
    queryFn: () => adminService.getUsers(page, size, search),
    placeholderData: keepPreviousData,
  })
}

