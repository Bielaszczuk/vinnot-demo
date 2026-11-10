import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { notificationsService } from "./notifications.service";
import { notificationsApiClient } from "@/infrastructure/api/clients/notifications.client";
import { locationService } from "@/application/services/location.service";
import { geocodingService } from "@/application/services/geocoding.service";

jest.mock("@/infrastructure/api/clients/notifications.client", () => ({
  notificationsApiClient: {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    getEventArea: jest.fn(),
    setEventArea: jest.fn(),
    clearEventArea: jest.fn(),
  },
}));
jest.mock("@/application/services/location.service", () => ({
  locationService: { getCurrentLocation: jest.fn() },
}));
jest.mock("@/application/services/geocoding.service", () => ({
  geocodingService: { geocodeAddress: jest.fn() },
}));

const client = notificationsApiClient as jest.Mocked<typeof notificationsApiClient>;
const location = locationService as jest.Mocked<typeof locationService>;
const geocoding = geocodingService as jest.Mocked<typeof geocodingService>;
const dto = {
  marketingConsent: { granted: true, decidedAt: "2026-10-19T12:00:00Z", source: "MOBILE" },
  categories: [
    { category: "SECURITY", kind: "TRANSACTIONAL", email: true, push: true, editable: false },
    { category: "NEWSLETTER", kind: "PROMOTIONAL", email: true, push: false, editable: true },
    { category: "FUTURE", kind: "OPTIONAL", email: true, push: true, editable: true },
  ],
};

describe("notifications application boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps the preferences and drops categories this build does not know", async () => {
    client.getPreferences.mockResolvedValue(dto);

    const preferences = await notificationsService.getPreferences();

    expect(preferences.marketingConsent).toEqual({ granted: true, decidedAt: "2026-10-19T12:00:00Z", source: "MOBILE" });
    expect(preferences.categories.map((item) => item.category)).toEqual(["SECURITY", "NEWSLETTER"]);
  });

  it("keeps the reminders category with the server's default (on)", async () => {
    client.getPreferences.mockResolvedValue({
      ...dto,
      categories: [{ category: "REMINDERS", kind: "OPTIONAL", email: true, push: true, editable: true }],
    });

    const preferences = await notificationsService.getPreferences();

    expect(preferences.categories).toEqual([
      { category: "REMINDERS", kind: "OPTIONAL", email: true, push: true, editable: true, emailAvailable: true, pushAvailable: true },
    ]);
  });

  it("reads which channels each category supports, assuming both on an older API", async () => {
    client.getPreferences.mockResolvedValue({
      ...dto,
      categories: [
        { category: "EVENTS_NEARBY", kind: "OPTIONAL", email: true, push: true, editable: true,
          emailAvailable: false, pushAvailable: true },
        { category: "SECURITY", kind: "TRANSACTIONAL", email: true, push: true, editable: false },
      ],
    });

    const preferences = await notificationsService.getPreferences();

    expect(preferences.categories).toEqual([
      expect.objectContaining({ category: "EVENTS_NEARBY", emailAvailable: false, pushAvailable: true }),
      expect.objectContaining({ category: "SECURITY", emailAvailable: true, pushAvailable: true }),
    ]);
  });

  it("sends one channel change from the mobile source", async () => {
    client.updatePreferences.mockResolvedValue(dto);

    await notificationsService.setChannel("EVENTS_NEARBY", "push", false);

    expect(client.updatePreferences).toHaveBeenCalledWith({
      source: "MOBILE",
      categories: [{ category: "EVENTS_NEARBY", push: false }],
    });
  });

  it("sends a consent decision without category changes", async () => {
    client.updatePreferences.mockResolvedValue(dto);

    await notificationsService.setMarketingConsent(false);

    expect(client.updatePreferences).toHaveBeenCalledWith({ source: "MOBILE", marketingConsent: false, categories: [] });
  });

  it("maps the event area and ignores shapes this build does not know", async () => {
    client.getEventArea.mockResolvedValueOnce({ kind: "REGION", regionId: "r1", regionName: "Valle de Uco" });
    client.getEventArea.mockResolvedValueOnce({ kind: "APPROXIMATE", regionId: null, regionName: null });
    client.getEventArea.mockResolvedValueOnce(null);
    client.getEventArea.mockResolvedValueOnce({ kind: "REGION", regionId: null, regionName: null });
    client.getEventArea.mockResolvedValueOnce({ kind: "COUNTRY", regionId: null, regionName: null });

    await expect(notificationsService.getEventArea()).resolves.toEqual({
      kind: "REGION",
      regionId: "r1",
      regionName: "Valle de Uco",
    });
    await expect(notificationsService.getEventArea()).resolves.toEqual({ kind: "APPROXIMATE" });
    await expect(notificationsService.getEventArea()).resolves.toBeNull();
    await expect(notificationsService.getEventArea()).resolves.toBeNull();
    await expect(notificationsService.getEventArea()).resolves.toBeNull();
  });

  it("chooses a catalogue region as the event area", async () => {
    client.setEventArea.mockResolvedValue(undefined);

    await expect(notificationsService.setEventAreaRegion({ id: "r1", name: "Valle de Uco" })).resolves.toEqual({
      kind: "REGION",
      regionId: "r1",
      regionName: "Valle de Uco",
    });
    expect(client.setEventArea).toHaveBeenCalledWith({ regionId: "r1" });
  });

  it("sends the current position as an approximate event area", async () => {
    location.getCurrentLocation.mockResolvedValue({ ok: true, latitude: -32.8895, longitude: -68.8458 });
    client.setEventArea.mockResolvedValue(undefined);

    await expect(notificationsService.setApproximateEventArea()).resolves.toEqual({
      ok: true,
      area: { kind: "APPROXIMATE" },
    });
    expect(client.setEventArea).toHaveBeenCalledWith({ latitude: -32.9, longitude: -68.8 });
  });

  it("sends nothing when the location is denied or unavailable", async () => {
    location.getCurrentLocation.mockResolvedValueOnce({ ok: false, reason: "permission_denied" });
    location.getCurrentLocation.mockResolvedValueOnce({ ok: false, reason: "location_unavailable" });

    await expect(notificationsService.setApproximateEventArea()).resolves.toEqual({
      ok: false,
      reason: "permission_denied",
    });
    await expect(notificationsService.setApproximateEventArea()).resolves.toEqual({
      ok: false,
      reason: "location_unavailable",
    });
    expect(client.setEventArea).not.toHaveBeenCalled();
  });

  it("finds a place on the map without saving it", async () => {
    geocoding.geocodeAddress.mockResolvedValue({
      ok: true,
      status: "OK",
      errorMessage: null,
      location: {
        latitude: -26.0729,
        longitude: -65.9762,
        formattedAddress: "Cafayate, Salta, Argentina",
        placeId: "p1",
        city: "Cafayate",
        region: "Salta",
        country: "Argentina",
      },
    });

    await expect(notificationsService.findPlace("  Cafayate ")).resolves.toEqual({
      ok: true,
      place: { latitude: -26.0729, longitude: -65.9762, name: "Cafayate, Salta, Argentina" },
    });
    expect(geocoding.geocodeAddress).toHaveBeenCalledWith("Cafayate");
    expect(client.setEventArea).not.toHaveBeenCalled();
  });

  it("says when the map does not know the place or cannot be reached", async () => {
    geocoding.geocodeAddress.mockResolvedValueOnce({ ok: false, status: "ZERO_RESULTS", errorMessage: null, location: null });
    geocoding.geocodeAddress.mockResolvedValueOnce({ ok: false, status: "UNKNOWN_ERROR", errorMessage: "offline", location: null });

    await expect(notificationsService.findPlace("Nowhere")).resolves.toEqual({ ok: false, reason: "not_found" });
    await expect(notificationsService.findPlace("Cafayate")).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  it("sends a point picked on the map rounded as an approximate event area", async () => {
    client.setEventArea.mockResolvedValue(undefined);

    await expect(
      notificationsService.setEventAreaPoint({ latitude: -26.0729, longitude: -65.9762, name: "Cafayate, Salta, Argentina" }),
    ).resolves.toEqual({ kind: "APPROXIMATE", placeName: "Cafayate, Salta, Argentina" });
    expect(client.setEventArea).toHaveBeenCalledWith({ latitude: -26.1, longitude: -66 });

    await expect(notificationsService.setEventAreaPoint({ latitude: -32.8908, longitude: -68.8272 })).resolves.toEqual({
      kind: "APPROXIMATE",
    });
    expect(client.setEventArea).toHaveBeenLastCalledWith({ latitude: -32.9, longitude: -68.8 });
  });

  it("clears the event area", async () => {
    client.clearEventArea.mockResolvedValue(undefined);

    await expect(notificationsService.clearEventArea()).resolves.toBeUndefined();
    expect(client.clearEventArea).toHaveBeenCalledTimes(1);
  });
});
