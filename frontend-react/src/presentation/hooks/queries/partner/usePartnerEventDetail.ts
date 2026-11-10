/**
 * usePartnerEventDetail — imperative fetch of a single event detail for editing
 *
 * Uses useMutation because this is an on-demand fetch triggered by a user click
 * (open edit modal), not an auto-refetching query.
 *
 * Flow: page → hook → service → client → http
 */
import { useMutation } from '@tanstack/react-query'
import { partnerService } from '@services/partner.service'

export function usePartnerEventDetail() {
  return useMutation<Awaited<ReturnType<typeof partnerService.getEventDetail>>, Error, string>({
    mutationFn: (eventId: string) => partnerService.getEventDetail(eventId),
  })
}
