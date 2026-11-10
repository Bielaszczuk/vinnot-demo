import { resolveWineAssetUrls as resolveCover } from "@/infrastructure/api/resolveApiAssetUrl";
/**
 * Events API Client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import type {
  EventDetailsDto,
  EventDiscoveryResponseDto,
  EventRegistrationDto,
  EventRegistrationsPageResponseDto,
  RegisterEventRequestDto,
  ReportEventPaymentRequestDto,
  ReviewEventRegistrationRequestDto,
  CreateEventRequestDto,
  UpdateEventRequestDto,
  EventFilterParamsDto,
  EventsPageResponseDto,
} from "@/infrastructure/api/dto/events.dto";

export const eventsApiClient = {
  async startCheckout(eventId: string, registrationId: string) {
    return (
      await http.post<{ attemptId: string; checkoutUrl: string | null }>(
        `/events/${eventId}/registrations/${registrationId}/checkout`,
        { returnToApp: true },
      )
    ).data;
  },
  getEvents: (params?: EventFilterParamsDto): Promise<EventsPageResponseDto> =>
    http
      .get<EventsPageResponseDto>("/events", { params })
      .then((r) => ({ ...r.data, content: r.data.content.map(resolveCover) })),

  getNearbyEvents: (
    latitude: number,
    longitude: number,
    radiusKm?: number,
    page = 0,
    size = 20,
  ): Promise<EventsPageResponseDto> =>
    http
      .get<EventsPageResponseDto>("/events/nearby", {
        params: { latitude, longitude, radiusKm, page, size },
      })
      .then((r) => ({ ...r.data, content: r.data.content.map(resolveCover) })),

  discoverEvents: (
    latitude: number,
    longitude: number,
    radiusKm = 100,
    page = 0,
    size = 20,
  ): Promise<EventDiscoveryResponseDto> =>
    http
      .get<EventDiscoveryResponseDto>("/events/discovery", {
        params: { latitude, longitude, radiusKm, page, size },
      })
      .then((r) => ({
        ...r.data,
        nearbyEvents: {
          ...r.data.nearbyEvents,
          content: r.data.nearbyEvents.content.map(resolveCover),
        },
        otherEvents: {
          ...r.data.otherEvents,
          content: r.data.otherEvents.content.map(resolveCover),
        },
      })),

  getEvent: (id: string): Promise<EventDetailsDto> =>
    http.get<EventDetailsDto>(`/events/${id}`).then((r) => resolveCover(r.data)),

  createEvent: (data: CreateEventRequestDto): Promise<EventDetailsDto> =>
    http.post<EventDetailsDto>("/events", data).then((r) => resolveCover(r.data)),

  updateEvent: (id: string, data: UpdateEventRequestDto): Promise<EventDetailsDto> =>
    http.patch<EventDetailsDto>(`/events/${id}`, data).then((r) => resolveCover(r.data)),

  deleteEvent: (id: string): Promise<void> => http.delete(`/events/${id}`).then(() => undefined),

  getEventRegistrations: (
    eventId: string,
    status?: string,
    page = 0,
    size = 20,
  ): Promise<EventRegistrationsPageResponseDto> =>
    http
      .get<EventRegistrationsPageResponseDto>(`/events/${eventId}/registrations`, {
        params: { status, page, size },
      })
      .then((r) => r.data),

  getMyRegistration: (eventId: string): Promise<EventRegistrationDto> =>
    http.get<EventRegistrationDto>(`/events/${eventId}/registrations/me`).then((r) => r.data),

  registerForEvent: (
    eventId: string,
    data: RegisterEventRequestDto,
  ): Promise<EventRegistrationDto> =>
    http.post<EventRegistrationDto>(`/events/${eventId}/register`, data).then((r) => r.data),

  reviewRegistration: (
    eventId: string,
    registrationId: string,
    data: ReviewEventRegistrationRequestDto,
  ): Promise<EventRegistrationDto> =>
    http
      .patch<EventRegistrationDto>(`/events/${eventId}/registrations/${registrationId}`, data)
      .then((r) => r.data),

  confirmAttendance: (registrationId: string): Promise<EventRegistrationDto> =>
    http
      .post<EventRegistrationDto>(`/events/registrations/${registrationId}/confirm-attendance`)
      .then((r) => r.data),

  reportPayment: (
    registrationId: string,
    data: ReportEventPaymentRequestDto,
  ): Promise<EventRegistrationDto> =>
    http
      .post<EventRegistrationDto>(`/events/registrations/${registrationId}/report-payment`, data)
      .then((r) => r.data),

  cancelRegistration: (eventId: string): Promise<void> =>
    http.delete(`/events/${eventId}/register`).then(() => undefined),
};
