import { describe, expect, it, jest } from "@jest/globals";
import { regionsService } from "./regions.service";
import { regionsClient } from "@/infrastructure/api/clients/regions.client";

jest.mock("@/infrastructure/api/clients/regions.client", () => ({
  regionsClient: {
    getCountries: jest.fn(),
    getRegions: jest.fn(),
    getRegionsByCountry: jest.fn(),
  },
}));

const client = regionsClient as jest.Mocked<typeof regionsClient>;

describe("regions.service", () => {
  it("maps countries and regions and preserves country identity", async () => {
    client.getCountries.mockResolvedValue([
      { id: "ar", code: "AR", name: "Argentina" },
    ]);
    const region = {
      id: "mza",
      name: "Mendoza",
      countryId: "ar",
      countryCode: "AR",
      countryName: "Argentina",
    };
    client.getRegions.mockResolvedValue([region]);
    client.getRegionsByCountry.mockResolvedValue([region]);

    await expect(regionsService.getCountries()).resolves.toEqual([
      { id: "ar", code: "AR", name: "Argentina" },
    ]);
    await expect(regionsService.getRegions()).resolves.toEqual([region]);
    await expect(regionsService.getRegionsByCountry("ar")).resolves.toEqual([region]);
    expect(client.getRegionsByCountry).toHaveBeenCalledWith("ar");
  });
});
