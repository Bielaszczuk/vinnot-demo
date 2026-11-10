import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { wineRoutesService } from "./wineRoutes.service";
import { wineRoutesApiClient } from "@/infrastructure/api/clients/wineRoutes.client";
import { mapWineRouteFromDto, mapWineRouteSummaryFromDto } from "@/domain/route/route.mappers";

jest.mock("@/infrastructure/api/clients/wineRoutes.client", () => ({
  wineRoutesApiClient: {
    getHierarchy: jest.fn(),
    getCountries: jest.fn(),
    getRegions: jest.fn(),
    getSubregions: jest.fn(),
    getWineRoutes: jest.fn(),
    getWineRoute: jest.fn(),
  },
}));

jest.mock("@/domain/route/route.mappers", () => ({
  mapWineRouteFromDto: jest.fn(),
  mapWineRouteSummaryFromDto: jest.fn(),
}));

const client = wineRoutesApiClient as jest.Mocked<typeof wineRoutesApiClient>;
const mapSummary = mapWineRouteSummaryFromDto as jest.MockedFunction<typeof mapWineRouteSummaryFromDto>;
const mapDetails = mapWineRouteFromDto as jest.MockedFunction<typeof mapWineRouteFromDto>;

describe("wineRoutes.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes legacy page fields and forwards route filters", async () => {
    client.getWineRoutes.mockResolvedValue({
      content: [{ id: "route-1" }],
      pageNumber: 2,
      pageSize: 5,
      totalItems: 11,
      totalPages: 3,
      first: false,
      last: true,
    } as never);
    mapSummary.mockReturnValue({ id: "route-1" } as never);

    const result = await wineRoutesService.getWineRoutes(
      { search: "andes", country: "Argentina" }, 2, 5,
    );

    expect(client.getWineRoutes).toHaveBeenCalledWith(expect.objectContaining({
      page: 2,
      size: 5,
      search: "andes",
      country: "Argentina",
    }));
    expect(result.pagination).toEqual({
      pageNumber: 2,
      pageSize: 5,
      totalItems: 11,
      totalPages: 3,
      hasNext: false,
      hasPrevious: true,
    });
  });

  it("maps hierarchy and route detail", async () => {
    client.getHierarchy.mockResolvedValue({
      countries: [{ name: "Argentina", regions: [{ name: "Mendoza", subregions: ["Uco"] }] }],
    });
    client.getWineRoute.mockResolvedValue({ id: "route-1" } as never);
    mapDetails.mockReturnValue({ id: "route-1" } as never);

    await expect(wineRoutesService.getHierarchy()).resolves.toEqual({
      countries: [{ name: "Argentina", regions: [{ name: "Mendoza", subregions: ["Uco"] }] }],
    });
    await expect(wineRoutesService.getWineRoute("route-1"))
      .resolves.toEqual({ id: "route-1" });
  });

  it("delegates geographic hierarchy leaf queries", async () => {
    client.getCountries.mockResolvedValue(["Argentina"]);
    client.getRegions.mockResolvedValue(["Mendoza"]);
    client.getSubregions.mockResolvedValue(["Uco"]);

    await expect(wineRoutesService.getCountries()).resolves.toEqual(["Argentina"]);
    await expect(wineRoutesService.getRegions("Argentina")).resolves.toEqual(["Mendoza"]);
    await expect(wineRoutesService.getSubregions("Argentina", "Mendoza"))
      .resolves.toEqual(["Uco"]);
  });
});
