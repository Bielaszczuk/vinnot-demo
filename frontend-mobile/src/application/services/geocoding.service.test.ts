import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { extractLocationParts, geocodingService } from "@/application/services/geocoding.service";
import { geocodingClient } from "@/infrastructure/api/clients/geocoding.client";
import { env } from "@/shared/config/env";

jest.mock("@/infrastructure/api/clients/geocoding.client", () => ({
  geocodingClient: { geocodeAddress: jest.fn() },
}));
jest.mock("@/shared/config/env", () => ({ env: { googleMapsApiKey: "maps-key" } }));

const geocodingClientMock = geocodingClient as jest.Mocked<typeof geocodingClient>;

describe("extractLocationParts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { googleMapsApiKey: string }).googleMapsApiKey = "maps-key";
  });
  it("normalizes Ciudad Autónoma de Buenos Aires for event filtering", () => {
    const result = extractLocationParts([
      { long_name: "Buenos Aires", short_name: "Buenos Aires", types: ["locality"] },
      {
        long_name: "Ciudad Autónoma de Buenos Aires",
        short_name: "CABA",
        types: ["administrative_area_level_1"],
      },
      { long_name: "Argentina", short_name: "AR", types: ["country"] },
    ]);

    expect(result).toEqual({
      city: "Ciudad Autónoma de Buenos Aires",
      region: "Buenos Aires",
      country: "Argentina",
    });
  });

  it("keeps the provider hierarchy for regular Argentine provinces", () => {
    const result = extractLocationParts([
      {
        long_name: "Ciudad de Mendoza",
        short_name: "Ciudad de Mendoza",
        types: ["locality"],
      },
      {
        long_name: "Mendoza",
        short_name: "Mendoza",
        types: ["administrative_area_level_1"],
      },
      { long_name: "Argentina", short_name: "AR", types: ["country"] },
    ]);

    expect(result).toEqual({
      city: "Ciudad de Mendoza",
      region: "Mendoza",
      country: "Argentina",
    });
  });

  it("uses geographic fallbacks when locality is absent", () => {
    expect(extractLocationParts([
      { long_name: "Distrito", short_name: "D", types: ["administrative_area_level_2"] },
      { long_name: "Portugal", short_name: "PT", types: ["country"] },
    ])).toEqual({ city: "Distrito", region: null, country: "Portugal" });
  });

  it("rejects empty input and missing configuration before transport", async () => {
    await expect(geocodingService.geocodeAddress("   ")).resolves.toMatchObject({
      ok: false, status: "EMPTY_ADDRESS",
    });
    (env as { googleMapsApiKey: string }).googleMapsApiKey = "";
    await expect(geocodingService.geocodeAddress("Mendoza")).resolves.toMatchObject({
      ok: false, status: "NO_API_KEY",
    });
    expect(geocodingClientMock.geocodeAddress).not.toHaveBeenCalled();
  });

  it("maps successful and unsuccessful provider responses", async () => {
    geocodingClientMock.geocodeAddress.mockResolvedValueOnce({
      status: "OK",
      results: [{
        formatted_address: "Mendoza, Argentina",
        place_id: "place-1",
        geometry: { location: { lat: -32.8, lng: -68.8 } },
        address_components: [
          { long_name: "Mendoza", short_name: "Mendoza", types: ["locality"] },
          { long_name: "Argentina", short_name: "AR", types: ["country"] },
        ],
      }],
    });
    await expect(geocodingService.geocodeAddress(" Mendoza ")).resolves.toMatchObject({
      ok: true,
      location: { latitude: -32.8, longitude: -68.8, placeId: "place-1" },
    });
    expect(geocodingClientMock.geocodeAddress).toHaveBeenCalledWith("Mendoza", "maps-key");

    geocodingClientMock.geocodeAddress.mockResolvedValueOnce({
      status: "ZERO_RESULTS", error_message: "not found", results: [],
    });
    await expect(geocodingService.geocodeAddress("unknown")).resolves.toMatchObject({
      ok: false, status: "ZERO_RESULTS", errorMessage: "not found",
    });
  });

  it("converts provider exceptions into stable application results", async () => {
    geocodingClientMock.geocodeAddress.mockRejectedValueOnce(new Error("provider offline"));
    await expect(geocodingService.geocodeAddress("Mendoza")).resolves.toMatchObject({
      ok: false, status: "UNKNOWN_ERROR", errorMessage: "provider offline",
    });
    geocodingClientMock.geocodeAddress.mockRejectedValueOnce("unknown");
    await expect(geocodingService.geocodeAddress("Mendoza")).resolves.toMatchObject({
      errorMessage: null,
    });
  });
});
