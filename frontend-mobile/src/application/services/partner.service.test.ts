import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { partnerService } from "./partner.service";
import { partnerApiClient } from "@/infrastructure/api/clients/partner.client";
import { mapPartnerEventFromRaw } from "@/domain/partner/partner.mappers";

jest.mock("@/infrastructure/api/clients/partner.client", () => ({
  partnerApiClient: {
    getMyEvents: jest.fn(),
    getEventDetail: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
  },
}));

jest.mock("@/domain/partner/partner.mappers", () => ({
  mapPartnerEventFromRaw: jest.fn(),
}));

const client = partnerApiClient as jest.Mocked<typeof partnerApiClient>;
const mapEvent = mapPartnerEventFromRaw as jest.MockedFunction<typeof mapPartnerEventFromRaw>;

describe("partner.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps partner pages without losing pagination totals", async () => {
    client.getMyEvents.mockResolvedValue({ items: [{ id: "event-1" }] as never, totalItems: 12 });
    mapEvent.mockReturnValue({ id: "event-1" } as never);

    await expect(partnerService.getMyEvents(2, 10)).resolves.toEqual({
      items: [{ id: "event-1" }],
      totalItems: 12,
    });
    expect(client.getMyEvents).toHaveBeenCalledWith({ page: 2, size: 10 });
  });

  it("asks the server to search the organizer's events", async () => {
    client.getMyEvents.mockResolvedValue({ items: [], totalItems: 0 });
    await partnerService.getMyEvents(0, 10, " cata ");
    expect(client.getMyEvents).toHaveBeenLastCalledWith({ page: 0, size: 10, search: "cata" });
    await partnerService.getMyEvents(0, 10, "  ");
    expect(client.getMyEvents).toHaveBeenLastCalledWith({ page: 0, size: 10 });
  });

  it("maps create and update responses and delegates deletion", async () => {
    const payload = { title: "Tasting" } as never;
    client.createEvent.mockResolvedValue({ id: "created" } as never);
    client.updateEvent.mockResolvedValue({ id: "updated" } as never);
    mapEvent.mockImplementation((raw) => raw as never);

    await expect(partnerService.createEvent(payload)).resolves.toEqual({ id: "created" });
    await expect(partnerService.updateEvent("event-1", payload))
      .resolves.toEqual({ id: "updated" });
    await partnerService.deleteEvent("event-1");

    expect(client.deleteEvent).toHaveBeenCalledWith("event-1");
    await partnerService.deleteEvent("event-1", { reason: "OTHER", note: "Moved" });
    expect(client.deleteEvent).toHaveBeenLastCalledWith("event-1", { reason: "OTHER", note: "Moved" });
  });

  it("maps partner event details", async () => {
    client.getEventDetail.mockResolvedValue({ id: "event-1" } as never);
    mapEvent.mockReturnValue({ id: "event-1", title: "Cata" } as never);

    await expect(partnerService.getEventDetail("event-1"))
      .resolves.toMatchObject({ id: "event-1", title: "Cata" });
  });
});
