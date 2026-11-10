/**
 * useAdminStats — fetches admin dashboard stats
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminStats } from '@domain/admin/admin.types'

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: queryKeys.admin.stats(),
    queryFn: () => adminService.getStats(),
  })
}

