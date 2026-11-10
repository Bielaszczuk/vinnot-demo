import { resolveWineAssetUrls as resolveCover } from "@infrastructure/http/resolveApiAssetUrl";
import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type {
  EventDetailsDto,
  EventDiscoveryResponseDto,
  EventRegistrationDto,
  EventRegistrationsPageResponseDto,
  RegisterEventRequestDto,
  ReportEventPaymentRequestDto,
  ReviewEventRegistrationRequestDto,
  CreateEventRequestDto,
  EventFilterParamsDto,
  EventsPageResponseDto,
} from '@api/dto/events.dto'

/**
 * Events API client
 * Note: Backend returns data directly (no wrapper).
 */
export const eventsClient = {
  async startCheckout(eventId: string, registrationId: string) {
    return (await http.post<{ attemptId: string; checkoutUrl: string | null }>(
      `/events/${eventId}/registrations/${registrationId}/checkout`,
    )).data;
  },
  /**
   * Get paginated list of events
   */
  async getEvents(params?: EventFilterParamsDto): Promise<EventsPageResponseDto> {
    const response = await http.get<EventsPageResponseDto>(API_ENDPOINTS.EVENTS, {
      params,
    })
    return { ...response.data, content: response.data.content.map(resolveCover) }
  },

  /**
   * Get nearby events
   */
  async getNearbyEvents(latitude: number, longitude: number, radiusKm?: number, page = 0, size = 20): Promise<EventsPageResponseDto> {
    const response = await http.get<EventsPageResponseDto>(
      `${API_ENDPOINTS.EVENTS}/nearby`,
      { params: { latitude, longitude, radiusKm, page, size } }
    )
    return { ...response.data, content: response.data.content.map(resolveCover) }
  },

  async discoverEvents(
    latitude: number,
    longitude: number,
    radiusKm = 100,
    page = 0,
    size = 20,
  ): Promise<EventDiscoveryResponseDto> {
    const response = await http.get<EventDiscoveryResponseDto>(
      `${API_ENDPOINTS.EVENTS}/discovery`,
      { params: { latitude, longitude, radiusKm, page, size } },
    )
    return { ...response.data, nearbyEvents: { ...response.data.nearbyEvents, content: response.data.nearbyEvents.content.map(resolveCover) }, otherEvents: { ...response.data.otherEvents, content: response.data.otherEvents.content.map(resolveCover) } }
  },

  /**
   * Get a single event by ID
   */
  async getEvent(id: string): Promise<EventDetailsDto> {
    const response = await http.get<EventDetailsDto>(`${API_ENDPOINTS.EVENTS}/${id}`)
    return resolveCover(response.data)
  },

  /**
   * Create a new event (partner/admin only)
   */
  async createEvent(data: CreateEventRequestDto): Promise<EventDetailsDto> {
    const response = await http.post<EventDetailsDto>(API_ENDPOINTS.EVENTS, data)
    return resolveCover(response.data)
  },

  /**
   * Update an event (partner/admin only)
   */
  async updateEvent(id: string, data: Partial<CreateEventRequestDto>): Promise<EventDetailsDto> {
    const response = await http.patch<EventDetailsDto>(
      `${API_ENDPOINTS.EVENTS}/${id}`,
      data
    )
    return resolveCover(response.data)
  },

  /**
   * Delete an event (admin only)
   */
  async deleteEvent(id: string): Promise<void> {
    await http.delete(`${API_ENDPOINTS.EVENTS}/${id}`)
  },

  /**
   * Get event attendees
   */
  async getEventRegistrations(
    eventId: string,
    status?: string,
    page = 0,
    size = 20,
  ): Promise<EventRegistrationsPageResponseDto> {
    const response = await http.get<EventRegistrationsPageResponseDto>(
      `${API_ENDPOINTS.EVENTS}/${eventId}/registrations`,
      { params: { status, page, size } },
    )
    return response.data
  },

  async getMyRegistration(eventId: string): Promise<EventRegistrationDto> {
    const response = await http.get<EventRegistrationDto>(
      `${API_ENDPOINTS.EVENTS}/${eventId}/registrations/me`,
    )
    return response.data
  },

  async registerForEvent(
    eventId: string,
    data: RegisterEventRequestDto,
  ): Promise<EventRegistrationDto> {
    const response = await http.post<EventRegistrationDto>(
      `${API_ENDPOINTS.EVENTS}/${eventId}/register`,
      data,
    )
    return response.data
  },

  async reviewRegistration(
    eventId: string,
    registrationId: string,
    data: ReviewEventRegistrationRequestDto,
  ): Promise<EventRegistrationDto> {
    const response = await http.patch<EventRegistrationDto>(
      `${API_ENDPOINTS.EVENTS}/${eventId}/registrations/${registrationId}`,
      data,
    )
    return response.data
  },

  async confirmAttendance(registrationId: string): Promise<EventRegistrationDto> {
    const response = await http.post<EventRegistrationDto>(
      `${API_ENDPOINTS.EVENTS}/registrations/${registrationId}/confirm-attendance`,
    )
    return response.data
  },

  async reportPayment(
    registrationId: string,
    data: ReportEventPaymentRequestDto,
  ): Promise<EventRegistrationDto> {
    const response = await http.post<EventRegistrationDto>(
      `${API_ENDPOINTS.EVENTS}/registrations/${registrationId}/report-payment`,
      data,
    )
    return response.data
  },

  async cancelRegistration(eventId: string): Promise<void> {
    await http.delete(`${API_ENDPOINTS.EVENTS}/${eventId}/register`)
  },
}

export default eventsClient
