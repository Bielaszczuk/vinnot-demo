import { resolveWineAssetUrls as resolveCover } from "@/infrastructure/api/resolveApiAssetUrl";
/**
 * Partner API Client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import type { PartnerEventDto, PartnerEventPayloadDto } from "@/infrastructure/api/dto/partner.dto";
import type { CancelEventRequestDto, EventDetailsDto } from "@/infrastructure/api/dto/events.dto";
import { normalizePaginated } from "./pagination";
import { toPatchRequest } from "./patchRequest";

export const partnerApiClient = {
  getMyEvents: async (params: { page: number; size: number; search?: string }): Promise<{ items: PartnerEventDto[]; totalItems: number }> => {
    // The API trims and matches `search` case-insensitively; a blank term is never sent.
    const search = params.search?.trim();
    const res = await http.get("/partner/events", {
      params: search ? { page: params.page, size: params.size, search } : { page: params.page, size: params.size },
    });
    const page = normalizePaginated<PartnerEventDto>(res.data as Record<string, unknown>);
    return { ...page, items: page.items.map(resolveCover) };
  },

  getEventDetail: (id: string): Promise<EventDetailsDto> =>
    http.get<EventDetailsDto>(`/events/${id}`).then((r) => resolveCover(r.data)),

  createEvent: (payload: PartnerEventPayloadDto): Promise<PartnerEventDto> =>
    http.post<PartnerEventDto>("/partner/events", payload).then((r) => resolveCover(r.data)),

  updateEvent: (id: string, payload: PartnerEventPayloadDto): Promise<PartnerEventDto> =>
    http.put<PartnerEventDto>(`/partner/events/${id}`, toPatchRequest(payload)).then((r) => resolveCover(r.data)),

  deleteEvent: (id: string, body?: CancelEventRequestDto): Promise<void> =>
    (body
      ? http.delete(`/partner/events/${id}`, { data: body })
      : http.delete(`/partner/events/${id}`)
    ).then(() => undefined),
};
