/**
 * Partner Service
 *
 * Application service layer for all partner module operations.
 * Orchestrates: partner client calls → domain type returns.
 */

import { partnerClient } from '@api/clients/partner.client'
import type {
  PartnerEvent,
  PartnerEventPayload,
  PartnerPaginatedResult,
} from '@domain/partner/partner.types'
import { mapPartnerEventFromRaw } from '@domain/partner/partner.mappers'
import { toCancellationRequest, type EventCancellation } from '@domain/event/eventCancellation'

export const partnerService = {
  /**
   * Get partner's own events (paginated)
   */
  async getMyEvents(page: number, size: number): Promise<PartnerPaginatedResult<PartnerEvent>> {
    const result = await partnerClient.getMyEvents({ page, size })
    return {
      items: result.items.map((item) => mapPartnerEventFromRaw(item as unknown as Record<string, unknown>)),
      totalItems: result.totalItems,
    }
  },

  /**
   * Get a single event detail for editing
   */
  async getEventDetail(id: string): Promise<PartnerEvent> {
    const event = await partnerClient.getEventDetail(id)
    return mapPartnerEventFromRaw(event as unknown as Record<string, unknown>)
  },

  /**
   * Create a new partner event
   */
  async createEvent(payload: PartnerEventPayload): Promise<PartnerEvent> {
    const event = await partnerClient.createEvent(payload)
    return mapPartnerEventFromRaw(event as unknown as Record<string, unknown>)
  },

  /**
   * Update a partner event
   */
  async updateEvent(id: string, payload: PartnerEventPayload): Promise<PartnerEvent> {
    const event = await partnerClient.updateEvent(id, payload)
    return mapPartnerEventFromRaw(event as unknown as Record<string, unknown>)
  },

  /**
   * Cancel a partner event; without a cancellation the backend applies its default reason
   */
  async deleteEvent(id: string, cancellation?: EventCancellation): Promise<void> {
    return partnerClient.deleteEvent(id, cancellation && toCancellationRequest(cancellation.reason, cancellation.note))
  },
}

export default partnerService
