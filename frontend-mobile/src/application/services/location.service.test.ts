import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { locationGateway } from "@/infrastructure/device/location.gateway";
import { locationService } from "./location.service";

jest.mock("@/infrastructure/device/location.gateway", () => ({
  locationGateway: {
    requestForegroundPermission: jest.fn(),
    getCurrentPosition: jest.fn(),
    reverseGeocode: jest.fn(),
  },
}));

const gatewayMock = locationGateway as jest.Mocked<typeof locationGateway>;

describe("locationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not request coordinates when location permission is denied", async () => {
    gatewayMock.requestForegroundPermission.mockResolvedValue(false);

    await expect(locationService.getCurrentLocation()).resolves.toEqual({
      ok: false,
      reason: "permission_denied",
    });
    expect(gatewayMock.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("returns the current coordinates when the device resolves them", async () => {
    gatewayMock.requestForegroundPermission.mockResolvedValue(true);
    gatewayMock.getCurrentPosition.mockResolvedValue({
      latitude: -34.6037,
      longitude: -58.3816,
    });

    await expect(locationService.getCurrentLocation()).resolves.toEqual({
      ok: true,
      latitude: -34.6037,
      longitude: -58.3816,
    });
  });

  it("normalizes device failures without leaking platform errors", async () => {
    gatewayMock.requestForegroundPermission.mockRejectedValue(new Error("device failure"));

    await expect(locationService.getCurrentLocation()).resolves.toEqual({
      ok: false,
      reason: "location_unavailable",
    });
  });

  it("maps the native reverse-geocoding response to the application contract", async () => {
    gatewayMock.reverseGeocode.mockResolvedValue({
      country: "Argentina",
      isoCountryCode: "AR",
    });

    await expect(
      locationService.resolveCountry({ latitude: -34.6037, longitude: -58.3816 }),
    ).resolves.toEqual({
      country: "Argentina",
      countryCode: "AR",
    });
  });

  it("returns null when reverse geocoding has no result or fails", async () => {
    gatewayMock.reverseGeocode.mockResolvedValueOnce(null);
    await expect(locationService.resolveCountry({ latitude: 0, longitude: 0 }))
      .resolves.toBeNull();

    gatewayMock.reverseGeocode.mockRejectedValueOnce(new Error("offline"));
    await expect(locationService.resolveCountry({ latitude: 0, longitude: 0 }))
      .resolves.toBeNull();
  });
});
