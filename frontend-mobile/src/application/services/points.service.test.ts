import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { pointsApiClient } from "@/infrastructure/api/clients/points.client";
import { pointsService } from "./points.service";

jest.mock("@/infrastructure/api/clients/points.client", () => ({
  pointsApiClient: { getMine: jest.fn(), celebrate: jest.fn() },
}));

const client = pointsApiClient as jest.Mocked<typeof pointsApiClient>;

describe("pointsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps the current user's points into the domain model", async () => {
    client.getMine.mockResolvedValue({
      points: 92, tier: "RACIMO", nextTier: "VENDIMIA", nextTierAt: 160, tierFloor: 80,
      todayEarned: 3, dailyCap: 40, pendingCelebration: "RACIMO", showWelcome: true,
      recent: [{ id: "a", source: "COMMENT", points: 1, createdAt: "2026-10-27T12:00:00Z", label: "Malbec" }],
    });
    const summary = await pointsService.getMine();
    expect(summary.tier).toBe("RACIMO");
    expect(summary.pendingCelebration).toBe("RACIMO");
    expect(summary.showWelcome).toBe(true);
    expect(summary.recent[0]?.createdAt).toEqual(new Date("2026-10-27T12:00:00Z"));
  });

  it("marks a tier as celebrated and dismisses the welcome card", async () => {
    client.celebrate.mockResolvedValue(undefined);
    await pointsService.markCelebrated("LAGAR");
    await pointsService.dismissWelcome();
    expect(client.celebrate).toHaveBeenNthCalledWith(1, { tier: "LAGAR" });
    expect(client.celebrate).toHaveBeenNthCalledWith(2, { welcome: true });
  });
});
