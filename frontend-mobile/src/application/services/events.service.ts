import { mapSandboxCheckout } from "./eventCheckout";
import { mapEventPagination } from "./eventPagination";
/**
 * Events Service.
 * @architecture: Capa 3 — Aplicación
 */
import { eventsApiClient } from "@/infrastructure/api/clients/events.client";
import {
  mapEventFromDto,
  mapEventRegistrationFromDto,
  mapEventSummaryFromDto,
} from "@/domain/event/event.mappers";
import type {
  Event,
  EventDiscoveryResult,
  EventFilter,
  EventPaymentMethod,
  EventRegistration,
  EventRegistrationAction,
  EventRegistrationStatus,
  EventStatus,
  EventType,
  RegisterForEventInput,
} from "@/domain/event/event.types";
import type {
  EventFilterParamsDto,
  CreateEventRequestDto,
  RegisterEventRequestDto,
  UpdateEventRequestDto,
} from "@/infrastructure/api/dto/events.dto";

export interface EventsResult {
  events: Event[];
  pagination: { pageNumber: number; pageSize: number; totalItems: number; totalPages: number; hasNext: boolean; hasPrevious: boolean };
}

export interface CreateEventInput {
  title: string;
  description: string;
  type: EventType;
  startDate: string;
  endDate: string;
  locationName: string;
  locationAddress?: string;
  locationCity: string;
  locationRegion?: string;
  locationCountry?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  maxAttendees?: number;
  imageUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: EventStatus;
}

export const eventsService = {
  async getEvents(filter?: EventFilter, page = 0, pageSize = 20): Promise<EventsResult> {
    const params: EventFilterParamsDto = {
      page,
      size: pageSize,
      search: filter?.search,
      type: Array.isArray(filter?.type) ? filter?.type[0] : filter?.type,
      city: filter?.city,
      region: filter?.region,
      country: filter?.country,
      startDate: filter?.startDate?.toISOString(),
      endDate: filter?.endDate?.toISOString(),
      minPrice: filter?.minPrice,
      maxPrice: filter?.maxPrice,
      status: filter?.status,
      latitude: filter?.latitude,
      longitude: filter?.longitude,
      radiusKm: filter?.radiusKm,
    };
    const response = await eventsApiClient.getEvents(params);
    const items = response.content ?? [];
    return {
      events: items.map(mapEventSummaryFromDto),
      pagination: mapEventPagination(response, page, pageSize),
    };
  },

  async getNearbyEvents(latitude: number, longitude: number, radiusKm = 50, page = 0, pageSize = 20): Promise<EventsResult> {
    const response = await eventsApiClient.getNearbyEvents(latitude, longitude, radiusKm, page, pageSize);
    const items = response.content ?? [];
    return {
      events: items.map(mapEventSummaryFromDto),
      pagination: mapEventPagination(response, page, pageSize),
    };
  },

  async discoverEvents(
    latitude: number,
    longitude: number,
    radiusKm = 100,
    page = 0,
    pageSize = 20,
  ): Promise<EventDiscoveryResult> {
    const response = await eventsApiClient.discoverEvents(
      latitude,
      longitude,
      radiusKm,
      page,
      pageSize,
    );
    const selectedPage = response.nearbyEventsFound
      ? response.nearbyEvents
      : response.otherEvents;
    return {
      radiusKm: response.radiusKm,
      nearbyEventsFound: response.nearbyEventsFound,
      message: response.message ?? null,
      nearbyEvents: response.nearbyEvents.content.map(mapEventSummaryFromDto),
      otherEvents: response.otherEvents.content.map(mapEventSummaryFromDto),
      pagination: mapEventPagination(selectedPage, page, pageSize),
    };
  },

  async getEvent(id: string): Promise<Event> {
    const response = await eventsApiClient.getEvent(id);
    return mapEventFromDto(response);
  },

  async createEvent(data: CreateEventInput): Promise<Event> {
    const response = await eventsApiClient.createEvent(toCreateEventRequest(data));
    return mapEventFromDto(response);
  },

  async updateEvent(id: string, data: UpdateEventInput): Promise<Event> {
    const response = await eventsApiClient.updateEvent(id, toUpdateEventRequest(data));
    return mapEventFromDto(response);
  },

  async deleteEvent(id: string): Promise<void> {
    await eventsApiClient.deleteEvent(id);
  },

  async getEventRegistrations(
    eventId: string,
    status?: EventRegistrationStatus,
    page = 0,
    pageSize = 20,
  ): Promise<{ registrations: EventRegistration[]; pagination: EventsResult["pagination"] }> {
    const response = await eventsApiClient.getEventRegistrations(
      eventId,
      status,
      page,
      pageSize,
    );
    return {
      registrations: response.content.map(mapEventRegistrationFromDto),
      pagination: mapEventPagination(response, page, pageSize),
    };
  },

  async getMyRegistration(eventId: string): Promise<EventRegistration> {
    return mapEventRegistrationFromDto(
      await eventsApiClient.getMyRegistration(eventId),
    );
  },

  async startCheckout(eventId: string, registrationId: string) {
    return mapSandboxCheckout(await eventsApiClient.startCheckout(eventId, registrationId));
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
      companionNames: input.companionNames?.map((name) => name.trim()).filter(Boolean),
      paymentMethod: input.paymentMethod,
    };
    return mapEventRegistrationFromDto(
      await eventsApiClient.registerForEvent(eventId, request),
    );
  },

  async reviewRegistration(
    eventId: string,
    registrationId: string,
    action: EventRegistrationAction,
    paymentMethod?: EventPaymentMethod,
    organizerNote?: string,
  ): Promise<EventRegistration> {
    return mapEventRegistrationFromDto(
      await eventsApiClient.reviewRegistration(eventId, registrationId, {
        action,
        paymentMethod,
        organizerNote: emptyToUndefined(organizerNote),
      }),
    );
  },

  async confirmAttendance(registrationId: string): Promise<EventRegistration> {
    return mapEventRegistrationFromDto(
      await eventsApiClient.confirmAttendance(registrationId),
    );
  },

  async reportPayment(
    registrationId: string,
    paymentMethod: EventPaymentMethod,
  ): Promise<EventRegistration> {
    return mapEventRegistrationFromDto(
      await eventsApiClient.reportPayment(registrationId, { paymentMethod }),
    );
  },

  async cancelRegistration(eventId: string): Promise<void> {
    await eventsApiClient.cancelRegistration(eventId);
  },
};

function toCreateEventRequest(data: CreateEventInput): CreateEventRequestDto {
  return { ...data };
}

function toUpdateEventRequest(data: UpdateEventInput): UpdateEventRequestDto {
  return {
    ...data,
  };
}

function emptyToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}
