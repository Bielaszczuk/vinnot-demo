import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { eventsService } from "./events.service";
import { eventsApiClient } from "@/infrastructure/api/clients/events.client";
import {
  mapEventFromDto,
  mapEventRegistrationFromDto,
  mapEventSummaryFromDto,
} from "@/domain/event/event.mappers";
import type { EventsPageResponseDto } from "@/infrastructure/api/dto/events.dto";

jest.mock("@/infrastructure/api/clients/events.client", () => ({
  eventsApiClient: {
    startCheckout: jest.fn(),
    getEvents: jest.fn(),
    getNearbyEvents: jest.fn(),
    discoverEvents: jest.fn(),
    getEvent: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    getEventRegistrations: jest.fn(),
    getMyRegistration: jest.fn(),
    registerForEvent: jest.fn(),
    reviewRegistration: jest.fn(),
    confirmAttendance: jest.fn(),
    reportPayment: jest.fn(),
    cancelRegistration: jest.fn(),
  },
}));

jest.mock("@/domain/event/event.mappers", () => ({
  mapEventFromDto: jest.fn(),
  mapEventSummaryFromDto: jest.fn(),
  mapEventRegistrationFromDto: jest.fn(),
}));

const eventsApiClientMock = eventsApiClient as jest.Mocked<typeof eventsApiClient>;
const mapEventFromDtoMock = mapEventFromDto as jest.MockedFunction<typeof mapEventFromDto>;
const mapEventSummaryFromDtoMock = mapEventSummaryFromDto as jest.MockedFunction<typeof mapEventSummaryFromDto>;
const mapEventRegistrationFromDtoMock = mapEventRegistrationFromDto as jest.MockedFunction<
  typeof mapEventRegistrationFromDto
>;

describe("events.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps paginated events from API and forwards filter params", async () => {
    const response: EventsPageResponseDto = {
      content: [{
        id: "evt-1",
        title: "Evento",
        type: "TASTING",
        status: "PUBLISHED",
        startDate: "2026-05-30T10:00:00.000Z",
        endDate: "2026-05-30T12:00:00.000Z",
        locationName: "Bodega Norte",
        locationCity: "Mendoza",
      }],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    };
    eventsApiClientMock.getEvents.mockResolvedValue(response);
    mapEventSummaryFromDtoMock.mockReturnValue({
      id: "evt-1",
      title: "Evento",
      description: "",
      type: "OTHER",
      startDate: new Date(),
      endDate: new Date(),
      location: { name: "", address: "", city: "", region: "", country: "", latitude: null, longitude: null },
      organizer: { id: "", name: "", email: "", phone: null },
      imageUrl: null,
      mapEmbedUrl: null,
      price: null,
      maxAttendees: null,
      currentAttendees: 0,
      heldAttendees: 0,
      availableSpots: null,
      registration: {
        currency: "ARS",
        deadline: null,
        maxTicketsPerRegistration: 6,
        approvalMode: "MANUAL",
        attendeeConfirmationRequired: true,
        holdMinutes: 60,
        paymentAlias: null,
        paymentQrUrl: null,
        paymentInstructions: null,
      },
      tags: [],
      status: "DRAFT",
      distanceKm: null,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await eventsService.getEvents({ search: "vino" }, 0, 20);

    expect(eventsApiClientMock.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 20, search: "vino" }),
    );
    expect(mapEventSummaryFromDtoMock).toHaveBeenCalledTimes(1);
    expect(result.events).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(1);
  });

  it("uses the fallback page when discovery finds no nearby events", async () => {
    eventsApiClientMock.discoverEvents.mockResolvedValue({
      radiusKm: 100,
      nearbyEventsFound: false,
      message: "Mostrando otros eventos",
      nearbyEvents: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
      otherEvents: { content: [], page: 1, size: 5, totalElements: 7, totalPages: 2 },
    });

    const result = await eventsService.discoverEvents(-32.8, -68.8);

    expect(eventsApiClientMock.discoverEvents).toHaveBeenCalledWith(-32.8, -68.8, 100, 0, 20);
    expect(result).toMatchObject({
      nearbyEventsFound: false,
      message: "Mostrando otros eventos",
      pagination: { pageNumber: 1, pageSize: 5, totalItems: 7, hasPrevious: true },
    });
  });

  it("normalizes optional registration fields before calling the client", async () => {
    eventsApiClientMock.registerForEvent.mockResolvedValue({} as never);
    mapEventRegistrationFromDtoMock.mockReturnValue({ id: "registration-1" } as never);

    const result = await eventsService.registerForEvent("event-1", {
      attendeeCount: 2,
      contactName: "  Ana  ",
      contactEmail: "   ",
      companionNames: [" Pedro ", " ", "Lucía"],
      note: "  Mesa exterior ",
      paymentMethod: "TRANSFER",
    });

    expect(eventsApiClientMock.registerForEvent).toHaveBeenCalledWith("event-1", {
      attendeeCount: 2,
      contactName: "Ana",
      contactEmail: undefined,
      contactPhone: undefined,
      note: "Mesa exterior",
      companionNames: ["Pedro", "Lucía"],
      paymentMethod: "TRANSFER",
    });
    expect(result).toMatchObject({ id: "registration-1" });
  });

  it("maps nearby pagination and nearby-first discovery", async () => {
    eventsApiClientMock.getNearbyEvents.mockResolvedValue({
      content: [], page: 1, size: 5, totalElements: 7, totalPages: 2,
    });
    const nearby = await eventsService.getNearbyEvents(-32.8, -68.8, 25, 1, 5);
    expect(nearby.pagination).toMatchObject({ hasNext: false, hasPrevious: true });

    eventsApiClientMock.discoverEvents.mockResolvedValue({
      radiusKm: 50,
      nearbyEventsFound: true,
      nearbyEvents: { content: [], page: 0, size: 10, totalElements: 1, totalPages: 1 },
      otherEvents: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 },
    });
    const discovery = await eventsService.discoverEvents(-32.8, -68.8, 50, 0, 10);
    expect(discovery).toMatchObject({ nearbyEventsFound: true, message: null });
  });

  it("orchestrates event CRUD and registration lifecycle", async () => {
    const eventDto = { id: "event-1" } as never;
    const registrationDto = { id: "registration-1" } as never;
    mapEventFromDtoMock.mockReturnValue({ id: "event-1" } as never);
    mapEventRegistrationFromDtoMock.mockReturnValue({ id: "registration-1" } as never);
    eventsApiClientMock.getEvent.mockResolvedValue(eventDto);
    eventsApiClientMock.createEvent.mockResolvedValue(eventDto);
    eventsApiClientMock.updateEvent.mockResolvedValue(eventDto);
    eventsApiClientMock.getEventRegistrations.mockResolvedValue({
      content: [registrationDto], page: 0, size: 20, totalElements: 1, totalPages: 1,
    });
    eventsApiClientMock.getMyRegistration.mockResolvedValue(registrationDto);
    eventsApiClientMock.reviewRegistration.mockResolvedValue(registrationDto);
    eventsApiClientMock.confirmAttendance.mockResolvedValue(registrationDto);
    eventsApiClientMock.reportPayment.mockResolvedValue(registrationDto);

    await eventsService.getEvent("event-1");
    await eventsService.createEvent({
      title: "Degustación", description: "Vinos", type: "TASTING",
      startDate: "2026-08-20T10:00:00Z", endDate: "2026-08-20T12:00:00Z",
      locationName: "Bodega", locationCity: "Mendoza",
    });
    await eventsService.updateEvent("event-1", { title: "Nueva degustación", status: "PUBLISHED" });
    await eventsService.deleteEvent("event-1");
    await expect(eventsService.getEventRegistrations("event-1", "REQUESTED")).resolves.toMatchObject({
      pagination: { hasNext: false, hasPrevious: false },
    });
    await eventsService.getMyRegistration("event-1");
    await eventsService.reviewRegistration("event-1", "registration-1", "APPROVE", "TRANSFER", " ok ");
    await eventsService.confirmAttendance("registration-1");
    await eventsService.reportPayment("registration-1", "TRANSFER");
    await eventsService.cancelRegistration("event-1");

    expect(eventsApiClientMock.reviewRegistration).toHaveBeenCalledWith(
      "event-1",
      "registration-1",
      { action: "APPROVE", paymentMethod: "TRANSFER", organizerNote: "ok" },
    );
  });
});

it('preserves explicit contact opt-in and distinguishes blank from omitted phone', async () => {
  jest.mocked(eventsApiClient.registerForEvent).mockResolvedValue({ id: 'r' } as never);
  await eventsService.registerForEvent('event-1', { attendeeCount: 1, contactPhone: ' +54 9 11 2345-6789 ', saveContactPhone: true });
  expect(eventsApiClient.registerForEvent).toHaveBeenLastCalledWith('event-1', expect.objectContaining({ contactPhone: '+54 9 11 2345-6789', saveContactPhone: true }));
  await eventsService.registerForEvent('event-1', { attendeeCount: 1, contactPhone: '', saveContactPhone: false });
  expect(eventsApiClient.registerForEvent).toHaveBeenLastCalledWith('event-1', expect.objectContaining({ contactPhone: '', saveContactPhone: false }));
});

it('preserves totals from the HTTP page wrapper for lists, nearby events and registrations', async () => {
  const page = {content:[],pageNumber:1,pageSize:10,totalItems:21,totalPages:3};
  jest.mocked(eventsApiClient.getEvents).mockResolvedValue(page);
  jest.mocked(eventsApiClient.getNearbyEvents).mockResolvedValue(page);
  jest.mocked(eventsApiClient.getEventRegistrations).mockResolvedValue(page);
  for (const result of await Promise.all([
    eventsService.getEvents(undefined,1,10),
    eventsService.getNearbyEvents(-32,-68,100,1,10),
    eventsService.getEventRegistrations('event',undefined,1,10),
  ])) expect(result.pagination).toEqual({pageNumber:1,pageSize:10,totalItems:21,totalPages:3,hasNext:true,hasPrevious:true});
});

it('validates checkout navigation returned for the requested reservation', async () => {
  const attemptId = 'f0da7948-e767-458d-9681-43a38ed9d6c9';
  jest.mocked(eventsApiClient.startCheckout).mockResolvedValue({ attemptId, checkoutUrl: null });
  await expect(eventsService.startCheckout('event', 'registration')).resolves.toEqual({ attemptId, checkoutUrl: null });
  expect(eventsApiClient.startCheckout).toHaveBeenCalledWith('event', 'registration');
  jest.mocked(eventsApiClient.startCheckout).mockResolvedValue({ attemptId, checkoutUrl: 'https://attacker.invalid/' });
  await expect(eventsService.startCheckout('event', 'registration')).rejects.toThrow();
});
