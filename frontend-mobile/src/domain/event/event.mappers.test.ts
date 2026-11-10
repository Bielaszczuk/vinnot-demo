import { describe, expect, it } from "@jest/globals";
import {
  mapEventFromDto,
  mapEventRegistrationFromDto,
  mapEventSummaryFromDto,
} from "./event.mappers";

describe("event.mappers", () => {
  it("maps summary dto with normalized type/status", () => {
    const mapped = mapEventSummaryFromDto({
      id: "evt-1",
      title: "Cata premium",
      type: "tasting",
      status: "published",
      locationName: "Bodega Norte",
      locationCity: "Mendoza",
      locationCountry: "Argentina",
    });

    expect(mapped.id).toBe("evt-1");
    expect(mapped.type).toBe("TASTING");
    expect(mapped.status).toBe("PUBLISHED");
    expect(mapped.location.name).toBe("Bodega Norte");
  });

  it("maps a registration and its lifecycle dates", () => {
    const registration = mapEventRegistrationFromDto({
      id: "reg-1",
      eventId: "evt-1",
      userId: "usr-1",
      attendeeCount: 2,
      companionNames: ["Luis"],
      status: "CONFIRMED",
      paymentStatus: "APPROVED",
      paymentMethod: "TRANSFER",
      currency: "ARS",
      createdAt: "2026-05-30T10:00:00.000Z",
      updatedAt: "2026-05-30T11:00:00.000Z",
      confirmedAt: "2026-05-30T10:30:00.000Z",
    });

    expect(registration.status).toBe("CONFIRMED");
    expect(registration.attendeeCount).toBe(2);
    expect(registration.confirmedAt).toEqual(
      new Date("2026-05-30T10:30:00.000Z"),
    );
  });

  it("maps detailed events and defaults missing type and status", () => {
    const event = mapEventFromDto({
      id: "evt-2",
      title: "Cena",
      type: null,
      status: null,
    });

    expect(event).toMatchObject({ id: "evt-2", type: "OTHER", status: "DRAFT" });
    expect(event.registration.currency).toBe("ARS");
  });

  it("keeps whether the event has a public page only when the API sends it", () => {
    const base = { id: "evt-3", title: "Cata", status: "CANCELLED" };
    expect(mapEventFromDto({ ...base, publiclyVisible: false }).publiclyVisible).toBe(false);
    expect(mapEventFromDto({ ...base, publiclyVisible: true }).publiclyVisible).toBe(true);
    expect(mapEventFromDto(base).publiclyVisible).toBeUndefined();
  });
});
