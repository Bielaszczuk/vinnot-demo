import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { wineriesService } from "./wineries.service";
import { wineriesApiClient } from "@/infrastructure/api/clients/wineries.client";
import { winesClient } from "@/infrastructure/api/clients/wines.client";
import { mapWineryFromDto, mapWinerySummaryFromDto } from "@/domain/winery/winery.mappers";
import { mapWinesPage } from "@/domain/wine/wine.mappers";

jest.mock("@/infrastructure/api/clients/wineries.client", () => ({
  wineriesApiClient: {
    getWineries: jest.fn(),
    getWinery: jest.fn(),
    updateCoordinates: jest.fn(),
  },
}));

jest.mock("@/infrastructure/api/clients/wines.client", () => ({
  winesClient: { getWines: jest.fn() },
}));

jest.mock("@/domain/winery/winery.mappers", () => ({
  mapWineryFromDto: jest.fn(),
  mapWinerySummaryFromDto: jest.fn(),
}));

jest.mock("@/domain/wine/wine.mappers", () => ({ mapWinesPage: jest.fn() }));

const client = wineriesApiClient as jest.Mocked<typeof wineriesApiClient>;
const wines = winesClient as jest.Mocked<typeof winesClient>;
const mapSummary = mapWinerySummaryFromDto as jest.MockedFunction<typeof mapWinerySummaryFromDto>;
const mapDetails = mapWineryFromDto as jest.MockedFunction<typeof mapWineryFromDto>;
const mapWinePage = mapWinesPage as jest.MockedFunction<typeof mapWinesPage>;

describe("wineries.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads the paging fields the API sends so further pages load", async () => {
    client.getWineries.mockResolvedValue({
      items: [{ id: "winery-1" }],
      content: [{ id: "winery-1" }],
      pageNumber: 1,
      pageSize: 10,
      totalItems: 21,
      totalPages: 3,
      first: false,
      last: false,
      hasNext: true,
      hasPrevious: true,
      empty: false,
    } as never);
    mapSummary.mockReturnValue({ id: "winery-1" } as never);

    const result = await wineriesService.getWineries({ search: "andes" }, 1, 10);

    expect(client.getWineries).toHaveBeenCalledWith(expect.objectContaining({
      search: "andes", page: 1, size: 10,
    }));
    expect(result.wineries).toEqual([{ id: "winery-1" }]);
    expect(result.pagination).toEqual({
      pageNumber: 1,
      pageSize: 10,
      totalItems: 21,
      totalPages: 3,
      hasNext: true,
      hasPrevious: true,
    });
  });

  it("stops paging on the last page", async () => {
    client.getWineries.mockResolvedValue({
      items: [], content: [], pageNumber: 2, pageSize: 10, totalItems: 21, totalPages: 3,
      first: false, last: true, hasNext: false, hasPrevious: true, empty: true,
    } as never);

    const result = await wineriesService.getWineries(undefined, 2, 10);

    expect(result.pagination).toMatchObject({ pageNumber: 2, hasNext: false, hasPrevious: true });
  });

  it("maps detail and wines and normalizes an absent coordinate address", async () => {
    client.getWinery.mockResolvedValue({ id: "winery-1" } as never);
    wines.getWines.mockResolvedValue({ items: [] } as never);
    mapDetails.mockReturnValue({ id: "winery-1" } as never);
    mapWinePage.mockReturnValue({ items: [] } as never);

    await wineriesService.getWinery("winery-1");
    await wineriesService.getWineryWines("winery-1", 2, 5);
    await wineriesService.updateWineryCoordinates("winery-1", -32.9, -68.8);

    expect(wines.getWines).toHaveBeenCalledWith({ wineryId: "winery-1", page: 2, size: 5 });
    expect(mapWinePage).toHaveBeenCalledWith({ items: [] });
    expect(client.updateCoordinates).toHaveBeenCalledWith("winery-1", {
      latitude: -32.9,
      longitude: -68.8,
      address: null,
    });
  });
});
