/**
 * useAdminReviews — paginated admin review list query
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminPaginatedResult, AdminReview } from '@domain/admin/admin.types'

export function useAdminReviews(page: number, size: number, search?: string) {
  return useQuery<AdminPaginatedResult<AdminReview>>({
    queryKey: queryKeys.admin.reviews.list({ page, size, search }),
    queryFn: () => adminService.getReviews(page, size, search),
    placeholderData: keepPreviousData,
  })
}

