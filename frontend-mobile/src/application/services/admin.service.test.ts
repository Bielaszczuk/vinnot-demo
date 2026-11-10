import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { adminService } from "./admin.service";
import { adminApiClient } from "@/infrastructure/api/clients/admin.client";
import {
  mapAdminEventFromRaw,
  mapAdminStatsFromRaw,
  mapAdminUserFromRaw,
  mapAdminWineFromRaw,
} from "@/domain/admin/admin.mappers";
import type { AdminStatsDto, AdminUserDto } from "@/infrastructure/api/dto/admin.dto";
import { wineProfileFixture } from "@/test/fixtures/wineProfile";

jest.mock("@/infrastructure/api/clients/admin.client", () => ({
  adminApiClient: {
    getWineSubmissions: jest.fn(),
    getWineSubmission: jest.fn(),
    getWineSubmissionImage: jest.fn(),
    decideWineSubmission: jest.fn(),
    uploadCatalogImage: jest.fn(),
    getWinery: jest.fn(),
    getEvent: jest.fn(),
    getStats: jest.fn(),
    getWines: jest.fn(),
    getWine: jest.fn(),
    createWine: jest.fn(),
    updateWine: jest.fn(),
    deleteWine: jest.fn(),
    getWineries: jest.fn(),
    createWinery: jest.fn(),
    updateWinery: jest.fn(),
    deleteWinery: jest.fn(),
    getEvents: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    getRoutes: jest.fn(),
    getRoute: jest.fn(),
    createRoute: jest.fn(),
    updateRoute: jest.fn(),
    deleteRoute: jest.fn(),
    getUsers: jest.fn(),
    updateUserRole: jest.fn(),
    updateUser: jest.fn(),
    banUser: jest.fn(),
    unbanUser: jest.fn(),
    deleteUser: jest.fn(),
    getReviews: jest.fn(),
    deleteReview: jest.fn(),
    getCountries: jest.fn(),
    getRegionsByCountry: jest.fn(),
    updateAiProfile: jest.fn(),
  },
}));

jest.mock("@/domain/admin/admin.mappers", () => ({
  mapAdminWineryFromRaw: (value: unknown) => value,
  mapAdminReviewFromRaw: (value: unknown) => value,
  mapAdminStatsFromRaw: jest.fn(),
  mapAdminUserFromRaw: jest.fn(),
  mapAdminWineFromRaw: jest.fn(),
  mapAdminEventFromRaw: jest.fn(),
}));

const adminApiClientMock = adminApiClient as jest.Mocked<typeof adminApiClient>;
const mapAdminStatsFromRawMock = mapAdminStatsFromRaw as jest.MockedFunction<
  typeof mapAdminStatsFromRaw
>;
const mapAdminUserFromRawMock = mapAdminUserFromRaw as jest.MockedFunction<
  typeof mapAdminUserFromRaw
>;
const mapAdminWineFromRawMock = mapAdminWineFromRaw as jest.MockedFunction<
  typeof mapAdminWineFromRaw
>;
const mapAdminEventFromRawMock = mapAdminEventFromRaw as jest.MockedFunction<
  typeof mapAdminEventFromRaw
>;

describe("admin.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads detail, moderation data and uploads images before saving", async () => {
    const winery = { id: "winery-1", name: "Tapiz" } as never;
    const event = { id: "event-1" } as never;
    adminApiClientMock.getWinery.mockResolvedValue(winery);
    adminApiClientMock.getEvent.mockResolvedValue(event);
    mapAdminEventFromRawMock.mockReturnValue(event);
    await expect(adminService.getWinery("winery-1")).resolves.toEqual(winery);
    await expect(adminService.getEvent("event-1")).resolves.toEqual(event);
    const submission = {
      id: "submission-1",
      submittedBy: "user-1",
      wineName: "Reserva",
      wineryName: "Tapiz",
      status: "PENDING" as const,
      imageAvailable: true,
      createdAt: "2026-09-23",
      updatedAt: "2026-09-23",
    };
    adminApiClientMock.getWineSubmissions.mockResolvedValue({ items: [submission], totalItems: 1 });
    adminApiClientMock.getWineSubmission.mockResolvedValue({
      ...submission, submittedByUsername: " contributor ", reasonCode: "LOW_CONFIDENCE",
    });
    adminApiClientMock.getWineSubmissionImage.mockResolvedValue("data:image/jpeg;base64,AA==");
    const list = await adminService.getWineSubmissions(0, 20, "PENDING", "Reserva");
    expect(list.items[0]).toMatchObject({
      submittedByUsername: null, grapes: [], vintage: null, reviewReason: null, reasonCode: null,
      wineryId: null, countryId: null, regionId: null, proposedGrapes: [],
    });
    const detail = await adminService.getWineSubmission("submission-1");
    expect(detail.submittedByUsername).toBe("contributor");
    expect(detail.reasonCode).toBe("LOW_CONFIDENCE");
    await adminService.decideWineSubmission("submission-1", {
      decision: "REJECT",
      reason: "Unreadable label",
    });
    expect(adminApiClientMock.decideWineSubmission).toHaveBeenCalledWith("submission-1", {
      decision: "REJECT",
      reason: "Unreadable label",
    });
    await expect(adminService.getWineSubmissionImage("submission-1")).resolves.toContain(
      "data:image/jpeg",
    );
    adminApiClientMock.uploadCatalogImage.mockResolvedValue("https://images.vinnot.com/wine.jpg");
    await adminService.updateWine("wine-1", { imageUrl: "data:image/jpeg;base64,AA==" });
    expect(adminApiClientMock.updateWine).toHaveBeenLastCalledWith("wine-1", {
      imageUrl: "https://images.vinnot.com/wine.jpg",
    });
    adminApiClientMock.uploadCatalogImage.mockRejectedValueOnce(new Error("upload failed"));
    const callsBefore = adminApiClientMock.updateWine.mock.calls.length;
    await expect(
      adminService.updateWine("wine-1", { imageUrl: "data:image/jpeg;base64,AA==" }),
    ).rejects.toThrow("upload failed");
    expect(adminApiClientMock.updateWine).toHaveBeenCalledTimes(callsBefore);
  });

  it("maps stats response through domain mapper", async () => {
    const statsDto: AdminStatsDto = { users: 3 };
    adminApiClientMock.getStats.mockResolvedValue(statsDto);
    mapAdminStatsFromRawMock.mockReturnValue({
      users: 3,
      wines: 0,
      wineries: 0,
      events: 0,
      reviews: 0,
      routes: 0,
      activeUsers: null,
      publishedEvents: null,
      publishedRoutes: null,
    });

    const stats = await adminService.getStats();
    expect(mapAdminStatsFromRawMock).toHaveBeenCalled();
    expect(stats.users).toBe(3);
  });

  it("maps paginated users list", async () => {
    const usersDto: { items: AdminUserDto[]; totalItems: number } = {
      items: [
        {
          id: "usr-1",
          username: "ana",
          email: "ana@vinnot.com",
          roles: ["ROLE_USER"],
        },
      ],
      totalItems: 1,
    };
    adminApiClientMock.getUsers.mockResolvedValue(usersDto);
    mapAdminUserFromRawMock.mockReturnValue({
      id: "usr-1",
      username: "ana",
      email: "ana@vinnot.com",
      name: "Ana",
      roles: ["ROLE_USER"],
      enabled: true,
      locked: false,
      lockReason: null,
      lastLoginAt: null,
      createdAt: "2026-05-30T10:00:00.000Z",
      points: 0,
      badgeTier: null,
    });

    const result = await adminService.getUsers(0, 20, "ana");
    expect(result.totalItems).toBe(1);
    expect(result.items[0]?.id).toBe("usr-1");
    expect(mapAdminUserFromRawMock).toHaveBeenCalledTimes(1);
  });

  it("maps wine and event CRUD responses", async () => {
    const wine = { id: "wine-1" } as never;
    const event = { id: "event-1" } as never;
    adminApiClientMock.getWines.mockResolvedValue({ items: [wine], totalItems: 1 });
    adminApiClientMock.getWine.mockResolvedValue(wine);
    adminApiClientMock.createWine.mockResolvedValue(wine);
    adminApiClientMock.updateWine.mockResolvedValue(wine);
    mapAdminWineFromRawMock.mockReturnValue(wine);
    adminApiClientMock.getEvents.mockResolvedValue({ items: [event], totalItems: 1 });
    adminApiClientMock.createEvent.mockResolvedValue(event);
    adminApiClientMock.updateEvent.mockResolvedValue(event);
    mapAdminEventFromRawMock.mockReturnValue(event);

    await expect(adminService.getWines(0, 20, "malbec")).resolves.toMatchObject({ totalItems: 1 });
    await adminService.getWine("wine-1");
    await adminService.createWine({ name: "Reserva" } as never);
    await adminService.updateWine("wine-1", { name: "Gran Reserva" } as never);
    await adminService.deleteWine("wine-1");
    await expect(adminService.getEvents(0, 20, "degustación")).resolves.toMatchObject({
      totalItems: 1,
    });
    await adminService.createEvent({ title: "Evento" } as never);
    await adminService.updateEvent("event-1", { title: "Evento" } as never);
    await adminService.deleteEvent("event-1");
    await adminService.deleteEvent("event-2", { reason: "WEATHER" });

    expect(mapAdminWineFromRawMock).toHaveBeenCalledTimes(4);
    expect(mapAdminEventFromRawMock).toHaveBeenCalledTimes(3);
    expect(adminApiClientMock.deleteEvent).toHaveBeenCalledWith("event-1");
    expect(adminApiClientMock.deleteEvent).toHaveBeenCalledWith("event-2", { reason: "WEATHER" });
  });

  it("delegates winery, route, review, catalog and user administration", async () => {
    const item = { id: "item-1" } as never;
    adminApiClientMock.getWineries.mockResolvedValue({ items: [item], totalItems: 1 });
    adminApiClientMock.createWinery.mockResolvedValue(item);
    adminApiClientMock.updateWinery.mockResolvedValue(item);
    adminApiClientMock.getRoutes.mockResolvedValue({ items: [item], totalItems: 1 });
    adminApiClientMock.getRoute.mockResolvedValue(item);
    adminApiClientMock.createRoute.mockResolvedValue(item);
    adminApiClientMock.updateRoute.mockResolvedValue(item);
    adminApiClientMock.getReviews.mockResolvedValue({ items: [item], totalItems: 1 });
    adminApiClientMock.getCountries.mockResolvedValue([item]);
    adminApiClientMock.getRegionsByCountry.mockResolvedValue([item]);

    await adminService.getWineries(0, 20, "norte", "Argentina", "Mendoza");
    await expect(adminService.createWinery(item)).resolves.toBe(item);
    await adminService.updateWinery("winery-1", item);
    await adminService.deleteWinery("winery-1");
    await adminService.getRoutes(0, 20, "ruta");
    await adminService.getRoute("route-1");
    await adminService.createRoute(item);
    await adminService.updateRoute("route-1", item);
    await adminService.deleteRoute("route-1");
    await adminService.updateUserRole("user-1", "ROLE_ADMIN");
    await adminService.banUser("user-1", "HARASSMENT", "insultos");
    expect(adminApiClientMock.banUser).toHaveBeenLastCalledWith("user-1", "HARASSMENT", undefined);
    await adminService.banUser("user-1", "OTHER", "  Contracargos  ");
    expect(adminApiClientMock.banUser).toHaveBeenLastCalledWith("user-1", "OTHER", "Contracargos");
    await adminService.unbanUser("user-1");
    await adminService.updateUser("user-1", { firstName: "Ana", lastName: "Pérez" });
    expect(adminApiClientMock.updateUser).toHaveBeenLastCalledWith("user-1", { firstName: "Ana", lastName: "Pérez" });
    adminApiClientMock.updateUser.mockClear();
    await adminService.updateUser("user-1", {});
    expect(adminApiClientMock.updateUser).not.toHaveBeenCalled();
    await adminService.deleteUser("user-1");
    await adminService.getReviews(0, 20, "comentario");
    await adminService.deleteReview("review-1");
    await adminService.getCountries();
    await adminService.getRegionsByCountry("country-1");
    adminApiClientMock.updateAiProfile.mockResolvedValue({
      wineId: "wine-1", generatedAt: "2026-10-06T12:00:00Z", cached: false,
      profileContent: { summary: "Edited English profile", palateAnalysis: { ...wineProfileFixture.palateAnalysis!, bodyScore: 0 } },
    });
    await expect(adminService.updateAiProfile("wine-1", { summary: "Edited English profile" }, "en"))
      .resolves.toMatchObject({ wineId: "wine-1", summary: "Edited English profile", palateAnalysis: { bodyScore: 0 } });
    expect(adminApiClientMock.updateAiProfile).toHaveBeenCalledWith("wine-1", { summary: "Edited English profile" }, "en");
    await expect(adminService.searchWineries("norte")).resolves.toMatchObject({ totalItems: 1 });

    expect(adminApiClientMock.getWineries).toHaveBeenLastCalledWith({
      page: 0,
      size: 10,
      search: "norte",
    });
  });
});
