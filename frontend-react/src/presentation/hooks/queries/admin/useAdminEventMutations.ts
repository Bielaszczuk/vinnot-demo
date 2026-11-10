/**
 * useAdminEventMutations — create, update, delete event mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminEventPayload } from '@domain/admin/admin.types'
import type { EventCancellation } from '@domain/event/eventCancellation'

export function useCreateAdminEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminEventPayload) => adminService.createEvent(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.events.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.events.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })
}

export function useUpdateAdminEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminEventPayload }) =>
      adminService.updateEvent(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.events.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.events.all() })
    },
  })
}

export function useDeleteAdminEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cancellation }: { id: string; cancellation?: EventCancellation }) =>
      adminService.deleteEvent(id, cancellation),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.events.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.events.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })
}
