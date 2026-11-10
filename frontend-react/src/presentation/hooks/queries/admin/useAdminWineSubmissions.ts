import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type {
  AdminPaginatedResult,
  AdminWineSubmission,
  AdminWineSubmissionStatus,
} from '@domain/admin/admin.types'
import { adminService } from '@services/admin.service'
import { queryKeys } from '@hooks/queries/queryKeys'

export function useAdminWineSubmissions(
  page: number,
  size: number,
  status?: AdminWineSubmissionStatus,
  search?: string,
) {
  return useQuery<AdminPaginatedResult<AdminWineSubmission>>({
    queryKey: queryKeys.admin.wineSubmissions.list({ page, size, status, search }),
    queryFn: () => adminService.getWineSubmissions(page, size, status, search),
    placeholderData: keepPreviousData,
  })
}

export function useAdminWineSubmission(id?: string) {
  return useQuery<AdminWineSubmission>({
    queryKey: queryKeys.admin.wineSubmissions.detail(id ?? ''),
    queryFn: () => adminService.getWineSubmission(id!),
    enabled: Boolean(id),
  })
}
