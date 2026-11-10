import { describe, expect, it } from "@jest/globals";
import {
  mapAdminWineryFromRaw,
  mapAdminEventFromRaw,
  mapAdminStatsFromRaw,
  mapAdminReviewFromRaw,
  mapAdminUserFromRaw,
  mapAdminWineFromRaw,
} from "./admin.mappers";

describe("admin.mappers", () => {
  it("normalizes winery detail while preserving zero coordinates", () => {
    expect(
      mapAdminWineryFromRaw({ id: "w", name: "Winery", latitude: 0, longitude: 0 }),
    ).toMatchObject({
      id: "w",
      name: "Winery",
      latitude: 0,
      longitude: 0,
      descriptionEs: null,
      descriptionEn: null,
      imageUrl: null,
      winesCount: 0,
    });
    expect(
      mapAdminWineryFromRaw({ descriptionEn: "Andean winery", imageUrl: "https://cdn.vinnot.com/c.jpg" }),
    ).toMatchObject({ descriptionEn: "Andean winery", imageUrl: "https://cdn.vinnot.com/c.jpg" });
    expect(mapAdminWineryFromRaw({}).id).toBe("");
  });
  it("maps stats using fallback totals", () => {
    const stats = mapAdminStatsFromRaw({
      totalUsers: 10,
      totalWines: 4,
      totalWineries: 3,
      totalEvents: 7,
      totalReviews: 22,
      totalRoutes: 2,
    });

    expect(stats.users).toBe(10);
    expect(stats.wines).toBe(4);
    expect(stats.routes).toBe(2);
  });

  it("normalizes roles and full name", () => {
    const user = mapAdminUserFromRaw({
      id: "usr-1",
      username: "ana",
      email: "ana@vinnot.com",
      firstName: "Ana",
      lastName: "Lopez",
      roles: ["ADMIN"],
      enabled: true,
      createdAt: "2026-05-30T10:00:00.000Z",
    });

    expect(user.name).toBe("Ana Lopez");
    expect(user).toMatchObject({ firstName: "Ana", lastName: "Lopez" });
    expect(mapAdminUserFromRaw({ id: "u4" })).toMatchObject({ firstName: null, lastName: null });
    expect(user.roles).toEqual(["ROLE_ADMIN"]);
    expect(user.enabled).toBe(true);
  });

  it("reads the admin endpoint's comma-separated role field", () => {
    expect(mapAdminUserFromRaw({ id: "u3", role: "ADMIN,USER", active: true }).roles).toEqual(["ROLE_ADMIN", "ROLE_USER"]);
  });

  it("maps a user's points and badge tier, hiding unknown tiers", () => {
    expect(mapAdminUserFromRaw({ id: "u1", points: 312, badgeTier: "LAGAR" })).toMatchObject({ points: 312, badgeTier: "LAGAR" });
    expect(mapAdminUserFromRaw({ id: "u2" })).toMatchObject({ points: 0, badgeTier: null });
  });

  it("maps an admin review with the reviewer's badge and a decimal rating", () => {
    const review = mapAdminReviewFromRaw({
      id: "r1",
      wineId: "w1",
      rating: 4.3,
      likesCount: 2,
      createdAt: "2026-10-27T10:00:00Z",
      reviewer: { id: "u1", username: "ana", displayName: "Ana", avatarUrl: null, badgeTier: "CRIANZA" },
      wine: { id: "w1", name: "Malbec", vintage: 2020 },
    });
    expect(review).toMatchObject({ id: "r1", rating: 4.3, likesCount: 2, title: null, isVerified: false });
    expect(review.reviewer?.badgeTier).toBe("CRIANZA");
    expect(review.wine).toEqual({ id: "w1", name: "Malbec", vintage: 2020 });
    expect(mapAdminReviewFromRaw({ id: "r2" })).toMatchObject({ wineId: "", rating: 0, reviewer: null, wine: null });
  });

  it("supports comma roles and maps admin wine and event records", () => {
    expect(mapAdminUserFromRaw({ id: 1, roles: "admin, user" }).roles).toEqual([
      "ROLE_ADMIN",
      "ROLE_USER",
    ]);
    expect(mapAdminWineFromRaw({ id: "wine-1", name: "Reserva" })).toMatchObject({
      id: "wine-1",
      wineType: "RED",
      grapes: [],
    });
    expect(mapAdminEventFromRaw({ id: "event-1", title: "Cata" })).toMatchObject({
      id: "event-1",
      title: "Cata",
      currency: "ARS",
    });
  });
});

it("preserves the active winery catalog count, including an actual zero", () => {
  expect(mapAdminWineryFromRaw({ id: "w1", name: "Winery", winesCount: 7 }).winesCount).toBe(7);
  expect(mapAdminWineryFromRaw({ id: "w2", name: "Empty", winesCount: 0 }).winesCount).toBe(0);
});
