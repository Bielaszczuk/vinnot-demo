import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { cellarService } from "./cellar.service";
import { cellarApiClient } from "@/infrastructure/api/clients/cellar.client";
import { mapCellarEntryFromDto } from "@/domain/cellar/cellar.mappers";

jest.mock("@/infrastructure/api/clients/cellar.client", () => ({
  cellarApiClient: {
    getCellar: jest.fn(),
    addWine: jest.fn(),
    removeWine: jest.fn(),
    updateWine: jest.fn(),
  },
}));

jest.mock("@/domain/cellar/cellar.mappers", () => ({
  mapCellarEntryFromDto: jest.fn(),
}));

const client = cellarApiClient as jest.Mocked<typeof cellarApiClient>;
const mapEntry = mapCellarEntryFromDto as jest.MockedFunction<typeof mapCellarEntryFromDto>;

describe("cellar.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps cellar entries and normalizes optional add fields", async () => {
    client.getCellar.mockResolvedValue([{ id: "entry-1" }] as never);
    client.addWine.mockResolvedValue({ id: "entry-2" } as never);
    mapEntry.mockReturnValueOnce({ id: "entry-1" } as never)
      .mockReturnValueOnce({ id: "entry-2" } as never);

    await expect(cellarService.getCellar()).resolves.toEqual([{ id: "entry-1" }]);
    await expect(cellarService.addWine({ wineId: "wine-1" }))
      .resolves.toEqual({ id: "entry-2" });

    expect(client.addWine).toHaveBeenCalledWith({
      wineId: "wine-1",
      rating: null,
      purchasePrice: null,
      notes: null,
    });
    expect(client.addWine.mock.calls[0]?.[0]).not.toHaveProperty("vintage");
  });

  it("sends the tasted vintage when adding a wine", async () => {
    client.addWine.mockResolvedValue({ id: "entry-2" } as never);
    mapEntry.mockReturnValue({ id: "entry-2" } as never);

    await cellarService.addWine({ wineId: "wine-1", vintage: 2018 });

    expect(client.addWine).toHaveBeenCalledWith(expect.objectContaining({ wineId: "wine-1", vintage: 2018 }));
  });

  it("replaces, clears or keeps the vintage on update", async () => {
    client.updateWine.mockResolvedValue({ id: "entry-1" } as never);
    mapEntry.mockReturnValue({ id: "entry-1" } as never);

    await cellarService.updateWine("entry-1", { rating: 4, vintage: 2020 });
    await cellarService.updateWine("entry-1", { rating: 4, vintage: null });

    const bodies = client.updateWine.mock.calls.map((call) => call[1]);
    expect(bodies[0]).toEqual({ rating: 4, purchasePrice: null, notes: null, vintage: 2020 });
    expect(bodies[1]).toEqual({ rating: 4, purchasePrice: null, notes: null, clearVintage: true });
  });

  it("normalizes updates and delegates deletion", async () => {
    client.updateWine.mockResolvedValue({ id: "entry-1" } as never);
    mapEntry.mockReturnValue({ id: "entry-1" } as never);

    await cellarService.updateWine("entry-1", { rating: 4 });
    await cellarService.removeWine("entry-1");

    expect(client.updateWine).toHaveBeenCalledWith("entry-1", {
      rating: 4,
      purchasePrice: null,
      notes: null,
    });
    expect(client.removeWine).toHaveBeenCalledWith("entry-1");
  });
});
