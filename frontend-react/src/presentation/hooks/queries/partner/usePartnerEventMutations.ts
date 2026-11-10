/**
 * usePartnerEventMutations — create, update, delete partner event mutations
 */
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { partnerService } from '@services/partner.service'
import type { PartnerEventPayload } from '@domain/partner/partner.types'
import type { EventCancellation } from '@domain/event/eventCancellation'

function refreshEventViews(qc: QueryClient, id?: string) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.partner.events.all() }),
    qc.invalidateQueries({ queryKey: queryKeys.events.lists() }),
    qc.invalidateQueries({ queryKey: [...queryKeys.events.all, 'nearby'] }),
    qc.invalidateQueries({ queryKey: [...queryKeys.events.all, 'discovery'] }),
    qc.invalidateQueries({ queryKey: queryKeys.admin.events.all() }),
    qc.invalidateQueries({ queryKey: queryKeys.admin.stats() }),
    ...(id ? [qc.invalidateQueries({ queryKey: queryKeys.events.detail(id) })] : []),
  ])
}

export function useCreatePartnerEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PartnerEventPayload) => partnerService.createEvent(payload),
    onSuccess: () => refreshEventViews(qc),
  })
}

export function useUpdatePartnerEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PartnerEventPayload }) =>
      partnerService.updateEvent(id, payload),
    onSuccess: (_result, { id }) => refreshEventViews(qc, id),
  })
}

export function useDeletePartnerEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cancellation }: { id: string; cancellation?: EventCancellation }) =>
      partnerService.deleteEvent(id, cancellation),
    onSuccess: (_result, { id }) => refreshEventViews(qc, id),
  })
}
