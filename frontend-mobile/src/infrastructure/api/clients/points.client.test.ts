import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { http } from "@/infrastructure/api/http";
import { pointsApiClient } from "./points.client";

jest.mock("@/infrastructure/api/http", () => ({
  http: { get: jest.fn(), post: jest.fn() },
}));

const httpMock = http as jest.Mocked<typeof http>;
const summary = { points: 40, tier: "PARRA", tierFloor: 30, todayEarned: 4, dailyCap: 40, recent: [] };

describe("pointsApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads the current user's points from the standard API envelope", async () => {
    httpMock.get.mockResolvedValue({ data: { data: summary, timestamp: "2026-10-27T00:00:00Z" } });
    await expect(pointsApiClient.getMine()).resolves.toEqual(summary);
    expect(httpMock.get).toHaveBeenCalledWith("/users/me/points");
  });

  it("also accepts an unwrapped body", async () => {
    httpMock.get.mockResolvedValue({ data: summary });
    await expect(pointsApiClient.getMine()).resolves.toEqual(summary);
  });

  it("marks a tier as celebrated and dismisses the welcome card", async () => {
    httpMock.post.mockResolvedValue({ data: undefined });
    await pointsApiClient.celebrate({ tier: "RACIMO" });
    await pointsApiClient.celebrate({ welcome: true });
    expect(httpMock.post).toHaveBeenNthCalledWith(1, "/users/me/points/celebrations", { tier: "RACIMO" });
    expect(httpMock.post).toHaveBeenNthCalledWith(2, "/users/me/points/celebrations", { welcome: true });
  });
});
