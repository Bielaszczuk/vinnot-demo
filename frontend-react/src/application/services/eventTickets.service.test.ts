import { vi, it, expect } from "vitest";
import {
  createEventTicketsService,
  type EventTicketsPort,
} from "./eventTickets.service";
const id = "65abf97c-205b-4c96-b5ba-7947c7f03920";
const ticket = {
  id,
  eventId: id,
  title: "Tasting",
  description: null,
  imageUrl: null,
  eventStatus: "PUBLISHED",
  startDate: "2026-10-20T18:00:00Z",
  endDate: "2026-10-20T20:00:00Z",
  locationName: null,
  locationAddress: null,
  locationCity: null,
  contactEmail: null,
  contactPhone: null,
  status: "CONFIRMED",
  paymentStatus: "APPROVED",
  attendeeCount: 2,
  totalAmount: 50,
  currency: "ARS",
  expiresAt: null,
};
function setup() {
  const client: EventTicketsPort = {
    list: vi
      .fn()
      .mockResolvedValue({
        content: [ticket],
        pageNumber: 0,
        totalPages: 1,
        totalItems: 1,
      }),
    get: vi.fn().mockResolvedValue(ticket),
    receipt: vi.fn().mockResolvedValue({ status: "CONFIRMED" }),
  };
  return { client, service: createEventTicketsService(client) };
}
it("maps private ticket dates and preserves pagination and payment state", async () => {
  const { service } = setup();
  const page = await service.list();
  expect(page.totalElements).toBe(1);
  expect(page.page).toBe(0);
  expect(page.totalPages).toBe(1);
  expect(page.tickets[0]!.startDate).toBeInstanceOf(Date);
  expect(page.tickets[0]!.expiresAt).toBeNull();
  expect((await service.get(id)).paymentStatus).toBe("APPROVED");
});
it("rejects invalid identifiers and pagination before requesting private data", async () => {
  const { service, client } = setup();
  for (const page of [-1, 0.5, NaN])
    await expect(service.list(page)).rejects.toThrow();
  for (const value of ["", "../users", "not-a-uuid"])
    await expect(service.get(value)).rejects.toThrow();
  expect(client.list).not.toHaveBeenCalled();
  expect(client.get).not.toHaveBeenCalled();
});
it("does not infer approval from an unknown response and bounds receipt input", async () => {
  const { service, client } = setup();
  expect(await service.receipt("opaque")).toBe("CONFIRMED");
  vi.mocked(client.receipt).mockResolvedValue({ status: "approved" });
  await expect(service.receipt("opaque")).rejects.toThrow();
  await expect(service.receipt("")).rejects.toThrow();
  await expect(service.receipt("a".repeat(513))).rejects.toThrow();
  expect(client.receipt).toHaveBeenCalledTimes(2);
});
