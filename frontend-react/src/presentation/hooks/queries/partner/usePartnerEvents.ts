/**
 * usePartnerEvents — paginated partner event list query
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { partnerService } from '@services/partner.service'
import type { PartnerPaginatedResult, PartnerEvent } from '@domain/partner/partner.types'

export function usePartnerEvents(page: number, size: number) {
  return useQuery<PartnerPaginatedResult<PartnerEvent>>({
    queryKey: queryKeys.partner.events.list({ page, size }),
    queryFn: () => partnerService.getMyEvents(page, size),
    placeholderData: keepPreviousData,
  })
}

