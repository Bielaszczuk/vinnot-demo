import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { http } from "@/infrastructure/api/http";
import { partnerApiClient } from "./partner.client";

jest.mock("@/infrastructure/api/http", () => ({
  http: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
const transport = http as jest.Mocked<typeof http>;

describe("partner HTTP contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transport.delete.mockResolvedValue({ data: {} });
  });

  it("sends the cancellation reason as the body of the event DELETE", async () => {
    await expect(partnerApiClient.deleteEvent("evt", { reason: "WEATHER" })).resolves.toBeUndefined();
    expect(transport.delete).toHaveBeenCalledWith("/partner/events/evt", { data: { reason: "WEATHER" } });
  });

  it("lists the fields the organizer emptied as clearFields when updating an event", async () => {
    transport.put.mockResolvedValue({ data: { id: "evt" } });
    await partnerApiClient.updateEvent("evt", { title: "Cata", contactPhone: null, websiteUrl: null } as never);
    expect(transport.put).toHaveBeenCalledWith("/partner/events/evt", {
      title: "Cata",
      contactPhone: null,
      websiteUrl: null,
      clearFields: ["contactPhone", "websiteUrl"],
    });
  });

  it("sends the trimmed search term only when there is one", async () => {
    transport.get.mockResolvedValue({ data: { content: [], totalElements: 0 } });
    await partnerApiClient.getMyEvents({ page: 1, size: 10, search: "  Malbec " });
    expect(transport.get).toHaveBeenLastCalledWith("/partner/events", { params: { page: 1, size: 10, search: "Malbec" } });
    await partnerApiClient.getMyEvents({ page: 0, size: 10, search: "   " });
    expect(transport.get).toHaveBeenLastCalledWith("/partner/events", { params: { page: 0, size: 10 } });
    await partnerApiClient.getMyEvents({ page: 0, size: 10 });
    expect(transport.get).toHaveBeenLastCalledWith("/partner/events", { params: { page: 0, size: 10 } });
  });

  it("keeps the bodiless DELETE when no reason is given", async () => {
    await partnerApiClient.deleteEvent("evt");
    expect(transport.delete).toHaveBeenCalledWith("/partner/events/evt");
  });
});
