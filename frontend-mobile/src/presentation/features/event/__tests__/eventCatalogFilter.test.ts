import { describe, expect, it } from "@jest/globals";
import type { Event } from "@/domain/event/event.types";
import {
  filterEventCatalog,
  normalizeEventSearch,
} from "@/presentation/features/event/eventCatalogFilter";

const baseEvent: Event = {
  id: "evt-1",
  title: "Feria de Pinot Noir",
  description: "Encuentro junto al mar",
  type: "FESTIVAL",
  startDate: new Date("2026-08-10T18:00:00.000Z"),
  endDate: new Date("2026-08-10T22:00:00.000Z"),
  location: {
    name: "Centro Cultural",
    address: "Av. Armada Argentina 100",
    city: "Rada Tilly",
    region: "Chubut",
    country: "Argentina",
    latitude: -45.924,
    longitude: -67.554,
  },
  organizer: {
    id: "org-1",
    name: "Vinnot Patagonia",
    email: "eventos@vinnot.com",
    phone: null,
  },
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
  status: "PUBLISHED",
  distanceKm: 5,
  isAvailable: true,
  createdAt: new Date("2026-07-25T10:00:00.000Z"),
  updatedAt: new Date("2026-07-25T10:00:00.000Z"),
};

describe("eventCatalogFilter", () => {
  it("normalizes accents, case and repeated whitespace", () => {
    expect(normalizeEventSearch("  Degustación   Única ")).toBe(
      "degustacion unica",
    );
  });

  it("matches event copy and geographic fields with normalized text", () => {
    expect(
      filterEventCatalog([baseEvent], { search: "  rada tilly " }),
    ).toEqual([baseEvent]);
  });

  it("accepts equivalent partial country labels", () => {
    const event = {
      ...baseEvent,
      location: {
        ...baseEvent.location,
        country: "República Argentina",
      },
    };

    expect(filterEventCatalog([event], { country: "Argentina" })).toEqual([
      event,
    ]);
  });

  it("does not treat a missing country as a match", () => {
    const event = {
      ...baseEvent,
      location: {
        ...baseEvent.location,
        country: "",
      },
    };

    expect(filterEventCatalog([event], { country: "Argentina" })).toEqual([]);
  });

  it("lets coordinate-based area discovery own the geographic decision", () => {
    const event = {
      ...baseEvent,
      location: {
        ...baseEvent.location,
        country: "Chile",
      },
    };

    expect(
      filterEventCatalog([event], {
        country: "Argentina",
        ignoreCountry: true,
      }),
    ).toEqual([event]);
  });
});
