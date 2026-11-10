/**
 * Partner Service.
 * @architecture: Capa 3 — Aplicación
 */
import { partnerApiClient } from "@/infrastructure/api/clients/partner.client";
import type { EventCancellationRequest } from "@/domain/event/eventCancellation";
import { mapPartnerEventFromRaw } from "@/domain/partner/partner.mappers";
import type { PartnerEvent, PartnerEventPayload, PartnerPaginatedResult } from "@/domain/partner/partner.types";

export const partnerService = {
  async getMyEvents(page: number, size: number, search?: string): Promise<PartnerPaginatedResult<PartnerEvent>> {
    const term = search?.trim();
    const result = await partnerApiClient.getMyEvents(term ? { page, size, search: term } : { page, size });
    return {
      items: result.items.map((item) => mapPartnerEventFromRaw(item)),
      totalItems: result.totalItems,
    };
  },

  async getEventDetail(id: string): Promise<PartnerEvent> {
    const result = await partnerApiClient.getEventDetail(id);
    return mapPartnerEventFromRaw(result);
  },

  createEvent: (payload: PartnerEventPayload): Promise<PartnerEvent> =>
    partnerApiClient.createEvent(payload).then((event) => mapPartnerEventFromRaw(event)),

  updateEvent: (id: string, payload: PartnerEventPayload): Promise<PartnerEvent> =>
    partnerApiClient.updateEvent(id, payload).then((event) => mapPartnerEventFromRaw(event)),

  deleteEvent: (id: string, cancellation?: EventCancellationRequest): Promise<void> =>
    cancellation ? partnerApiClient.deleteEvent(id, cancellation) : partnerApiClient.deleteEvent(id),
};
