import { resolveWineAssetUrls as resolveCover } from "@infrastructure/http/resolveApiAssetUrl";
/**
 * Partner API Client
 *
 * Handles all partner-specific API calls to /partner/* and /events/* endpoints.
 * Uses the configured axios instance for automatic token handling.
 * All endpoint paths derived from API_ENDPOINTS constants.
 */

import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type {
  PartnerEventDto,
  PartnerEventPayloadDto,
} from '@api/dto/partner.dto'
import type { CancelEventRequestDto, EventDetailsDto } from '@api/dto/events.dto'
import { normalizePaginated } from './pagination'
import { toPatchRequest } from './patchRequest'

export const partnerClient = {
  /**
   * Get partner's own events (paginated)
   * GET /partner/events
   */
  async getMyEvents(params: { page: number; size: number }): Promise<{ items: PartnerEventDto[]; totalItems: number }> {
    const res = await http.get(API_ENDPOINTS.PARTNER.EVENTS, { params })
    const page = normalizePaginated<PartnerEventDto>(res.data)
    return { ...page, items: page.items.map(resolveCover) }
  },

  /**
   * Get a single event detail for editing
   * GET /events/:id
   */
  async getEventDetail(id: string): Promise<EventDetailsDto> {
    const res = await http.get<EventDetailsDto>(`${API_ENDPOINTS.EVENTS}/${id}`)
    return resolveCover(res.data)
  },

  /**
   * Create a new partner event
   * POST /partner/events
   */
  async createEvent(payload: PartnerEventPayloadDto): Promise<PartnerEventDto> {
    const res = await http.post<PartnerEventDto>(API_ENDPOINTS.PARTNER.EVENTS, payload)
    return resolveCover(res.data)
  },

  /**
   * Update a partner event
   * PUT /partner/events/:id
   */
  async updateEvent(id: string, payload: PartnerEventPayloadDto): Promise<PartnerEventDto> {
    const res = await http.put<PartnerEventDto>(`${API_ENDPOINTS.PARTNER.EVENTS}/${id}`, toPatchRequest(payload))
    return resolveCover(res.data)
  },

  /**
   * Cancel a partner event, optionally with the cancellation reason
   * DELETE /partner/events/:id
   */
  async deleteEvent(id: string, body?: CancelEventRequestDto): Promise<void> {
    const url = `${API_ENDPOINTS.PARTNER.EVENTS}/${id}`
    await (body ? http.delete(url, { data: body }) : http.delete(url))
  },
}

export default partnerClient
