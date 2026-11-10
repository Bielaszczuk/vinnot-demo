/**
 * useAdminEvents — paginated admin event list query
 */
import { useMutation, useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminPaginatedResult, AdminEvent } from '@domain/admin/admin.types'

export function useAdminEvents(page: number, size: number, search?: string) {
  return useQuery<AdminPaginatedResult<AdminEvent>>({
    queryKey: queryKeys.admin.events.list({ page, size, search }),
    queryFn: () => adminService.getEvents(page, size, search),
    placeholderData: keepPreviousData,
  })
}

export function useAdminEventDetail() {
  return useMutation<AdminEvent, Error, string>({
    mutationFn: (eventId: string) => adminService.getEvent(eventId),
  })
}
