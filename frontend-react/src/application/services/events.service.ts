import { mapSandboxCheckout } from "./eventCheckout";
import { mapEventPagination } from "./eventPagination";
import { eventsClient } from '@api/clients/events.client'
import {
  mapEventFromDto,
  mapEventRegistrationFromDto,
  mapEventSummaryFromDto,
  mapEventToDto,
} from '@domain/event/event.mappers'
import type {
  Event,
  EventDiscoveryResult,
  EventFilter,
  EventPaymentMethod,
  EventRegistration,
  EventRegistrationAction,
  EventRegistrationStatus,
  RegisterForEventInput,
} from '@domain/event/event.types'
import type {
  EventFilterParamsDto,
  CreateEventRequestDto,
  RegisterEventRequestDto,
} from '@api/dto/events.dto'
import type { PageMeta } from '@api/api.types'

export interface EventsResult {
  events: Event[]
  pagination: PageMeta
}

/**
 * Events service
 */
export const eventsService = {
  /**
   * Get paginated list of events
   */
  async getEvents(filter?: EventFilter, page = 0, pageSize = 20): Promise<EventsResult> {
    const params: EventFilterParamsDto = {
      page,
      size: pageSize,
      search: filter?.search,
      type: (Array.isArray(filter?.type) ? filter?.type[0] : filter?.type) as EventFilterParamsDto['type'],
      city: filter?.city,
      region: filter?.region,
      country: filter?.country,
      startDate: filter?.startDate?.toISOString(),
      endDate: filter?.endDate?.toISOString(),
      minPrice: filter?.minPrice,
      maxPrice: filter?.maxPrice,
      status: filter?.status,
      sortBy: filter?.sortBy as EventFilterParamsDto['sortBy'],
      sortDirection: filter?.sortOrder?.toUpperCase() as 'ASC' | 'DESC',
    }

    const response = await eventsClient.getEvents(params)

    const items = response.content ?? []

    return {
      events: items.map(mapEventSummaryFromDto),
      pagination: mapEventPagination(response, page, pageSize),
    }
  },

  /**
   * Get nearby events
   */
  async getNearbyEvents(latitude: number, longitude: number, radiusKm = 100, page = 0, pageSize = 20): Promise<EventsResult> {
    const response = await eventsClient.getNearbyEvents(latitude, longitude, radiusKm, page, pageSize)

    const items = response.content ?? []

    return {
      events: items.map(mapEventSummaryFromDto),
      pagination: mapEventPagination(response, page, pageSize),
    }
  },

  async discoverEvents(
    latitude: number,
    longitude: number,
    radiusKm = 100,
    page = 0,
    pageSize = 20,
  ): Promise<EventDiscoveryResult> {
    const response = await eventsClient.discoverEvents(
      latitude,
      longitude,
      radiusKm,
      page,
      pageSize,
    )
    const selectedPage = response.nearbyEventsFound
      ? response.nearbyEvents
      : response.otherEvents
    return {
      radiusKm: response.radiusKm,
      nearbyEventsFound: response.nearbyEventsFound,
      message: response.message ?? null,
      nearbyEvents: response.nearbyEvents.content.map(mapEventSummaryFromDto),
      otherEvents: response.otherEvents.content.map(mapEventSummaryFromDto),
      pagination: mapEventPagination(selectedPage, page, pageSize),
    }
  },

  /**
   * Get a single event by ID
   */
  async getEvent(id: string): Promise<Event> {
    const response = await eventsClient.getEvent(id)
    return mapEventFromDto(response)
  },

  /**
   * Create a new event
   */
  async createEvent(event: Omit<Event, 'id' | 'currentAttendees' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const dto = mapEventToDto(event) as CreateEventRequestDto
    const response = await eventsClient.createEvent(dto)
    return mapEventFromDto(response)
  },

  /**
   * Update an event
   */
  async updateEvent(id: string, event: Partial<Event>): Promise<Event> {
    const dto = mapEventToDto(event) as Partial<CreateEventRequestDto>
    const response = await eventsClient.updateEvent(id, dto)
    return mapEventFromDto(response)
  },

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<void> {
    await eventsClient.deleteEvent(id)
  },

  /**
   * Get event attendees
   */
  async getEventRegistrations(
    eventId: string,
    status?: EventRegistrationStatus,
    page = 0,
    pageSize = 20,
  ): Promise<{ registrations: EventRegistration[]; pagination: PageMeta }> {
    const response = await eventsClient.getEventRegistrations(
      eventId,
      status,
      page,
      pageSize,
    )
    return {
      registrations: response.content.map(mapEventRegistrationFromDto),
      pagination: mapEventPagination(response, page, pageSize),
    }
  },

  async getMyRegistration(eventId: string): Promise<EventRegistration> {
    return mapEventRegistrationFromDto(
      await eventsClient.getMyRegistration(eventId),
    )
  },

  async startCheckout(eventId: string, registrationId: string) {
    return mapSandboxCheckout(await eventsClient.startCheckout(eventId, registrationId));
  },

  async registerForEvent(
    eventId: string,
    input: RegisterForEventInput,
  ): Promise<EventRegistration> {
    const request: RegisterEventRequestDto = {
      attendeeCount: input.attendeeCount,
      contactName: emptyToUndefined(input.contactName),
      contactEmail: emptyToUndefined(input.contactEmail),
      contactPhone: input.contactPhone === undefined ? undefined : input.contactPhone.trim(),
      ...(input.notificationLanguage ? { notificationLanguage: input.notificationLanguage } : {}),
      ...(input.saveContactPhone !== undefined ? { saveContactPhone: input.saveContactPhone } : {}),
      note: emptyToUndefined(input.note),
      companionNames: input.companionNames?.filter(Boolean),
      paymentMethod: input.paymentMethod,
    }
    return mapEventRegistrationFromDto(
      await eventsClient.registerForEvent(eventId, request),
    )
  },

  async reviewRegistration(
    eventId: string,
    registrationId: string,
    action: EventRegistrationAction,
    paymentMethod?: EventPaymentMethod,
    organizerNote?: string,
  ): Promise<EventRegistration> {
    return mapEventRegistrationFromDto(
      await eventsClient.reviewRegistration(eventId, registrationId, {
        action,
        paymentMethod,
        organizerNote: emptyToUndefined(organizerNote),
      }),
    )
  },

  async confirmAttendance(registrationId: string): Promise<EventRegistration> {
    return mapEventRegistrationFromDto(
      await eventsClient.confirmAttendance(registrationId),
    )
  },

  async reportPayment(
    registrationId: string,
    paymentMethod: EventPaymentMethod,
  ): Promise<EventRegistration> {
    return mapEventRegistrationFromDto(
      await eventsClient.reportPayment(registrationId, { paymentMethod }),
    )
  },

  /**
   * Cancel event registration
   */
  async cancelRegistration(eventId: string): Promise<void> {
    await eventsClient.cancelRegistration(eventId)
  },
}

function emptyToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

export default eventsService
