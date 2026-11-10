import { mapPointsSummary } from "./points.mappers";

describe("mapPointsSummary", () => {
  it("maps the summary, its tiers and the recent movements", () => {
    expect(
      mapPointsSummary({
        points: 1372,
        tier: "RESERVA",
        nextTier: "GRAN_RESERVA",
        nextTierAt: 1600,
        tierFloor: 1000,
        todayEarned: 12,
        dailyCap: 40,
        pendingCelebration: "RESERVA",
        showWelcome: false,
        recent: [
          { id: "e1", source: "REVIEW", points: 3, createdAt: "2026-10-27T10:00:00Z", label: "Malbec 2020" },
          { id: "e2", source: "LIKE_RECEIVED", points: -1, createdAt: "2026-10-26T10:00:00Z" },
        ],
      }),
    ).toEqual({
      points: 1372,
      tier: "RESERVA",
      nextTier: "GRAN_RESERVA",
      nextTierAt: 1600,
      tierFloor: 1000,
      todayEarned: 12,
      dailyCap: 40,
      pendingCelebration: "RESERVA",
      showWelcome: false,
      recent: [
        { id: "e1", source: "REVIEW", points: 3, createdAt: new Date("2026-10-27T10:00:00Z"), label: "Malbec 2020" },
        { id: "e2", source: "LIKE_RECEIVED", points: -1, createdAt: new Date("2026-10-26T10:00:00Z"), label: null },
      ],
    });
  });

  it("falls back safely on missing or unknown fields", () => {
    const summary = mapPointsSummary({
      points: 0,
      tier: "SOMETHING_NEW",
      tierFloor: 0,
      todayEarned: 0,
      dailyCap: 40,
      recent: [{ id: "e3", source: "SHARE", points: 2, createdAt: "2026-10-27T10:00:00Z", label: null }],
    });
    expect(summary.tier).toBe("BROTE");
    expect(summary.nextTier).toBeNull();
    expect(summary.nextTierAt).toBeNull();
    expect(summary.pendingCelebration).toBeNull();
    expect(summary.showWelcome).toBe(false);
    expect(summary.recent[0]?.source).toBeNull();
    expect(mapPointsSummary({ points: 5, tier: "BROTE", tierFloor: 0, todayEarned: 0, dailyCap: 40, recent: null }).recent).toEqual([]);
  });

  it("derives an unknown tier from the points instead of showing the first seal", () => {
    const base = { tierFloor: 0, todayEarned: 0, dailyCap: 40, recent: null };
    expect(mapPointsSummary({ ...base, points: 5007, tier: "ICONO_VINNOT" }).tier).toBe("VINNOT");
    expect(mapPointsSummary({ ...base, points: 30, tier: "PAMPANO" }).tier).toBe("PARRA");
    expect(mapPointsSummary({ ...base, points: 2599, tier: "" }).tier).toBe("GRAN_RESERVA");
    expect(mapPointsSummary({ ...base, points: -3, tier: "?" }).tier).toBe("BROTE");
  });
});
