import {
  BADGE_TIERS,
  badgeTierSlug,
  badgeTierThreshold,
  parseBadgeTier,
  tierProgress,
} from "./badgeTiers";

describe("badge tiers", () => {
  it("lists the eleven tiers in ascending order with their thresholds", () => {
    expect(BADGE_TIERS.map((tier) => [tier.key, tier.threshold])).toEqual([
      ["BROTE", 0],
      ["PARRA", 30],
      ["RACIMO", 80],
      ["VENDIMIA", 160],
      ["LAGAR", 280],
      ["BARRICA", 450],
      ["CRIANZA", 700],
      ["RESERVA", 1000],
      ["GRAN_RESERVA", 1600],
      ["GRAN_ENOFILO", 2600],
      ["VINNOT", 5000],
    ]);
  });

  it("derives the art slug from the key", () => {
    expect(badgeTierSlug("GRAN_RESERVA")).toBe("gran-reserva");
    expect(badgeTierSlug("VINNOT")).toBe("vinnot");
    expect(badgeTierSlug("PARRA")).toBe("parra");
    expect(badgeTierThreshold("RESERVA")).toBe(1000);
  });

  it("keeps display names out of the domain; the locale files name each tier", () => {
    expect(BADGE_TIERS.every((tier) => !("name" in tier))).toBe(true);
  });

  it("accepts only known keys and turns anything else into no badge", () => {
    expect(parseBadgeTier("LAGAR")).toBe("LAGAR");
    expect(parseBadgeTier(null)).toBeNull();
    expect(parseBadgeTier(undefined)).toBeNull();
    expect(parseBadgeTier("SOMMELIER")).toBeNull();
    expect(parseBadgeTier("PARRA")).toBe("PARRA");
    expect(parseBadgeTier("VINNOT")).toBe("VINNOT");
    expect(parseBadgeTier("PAMPANO")).toBeNull();
    expect(parseBadgeTier("ICONO_VINNOT")).toBeNull();
    expect(parseBadgeTier(3)).toBeNull();
  });
});

describe("tierProgress", () => {
  it("measures the way from the tier floor to the next tier", () => {
    expect(tierProgress({ points: 1372, tierFloor: 1000, nextTier: "GRAN_RESERVA", nextTierAt: 1600 })).toEqual({
      fraction: 0.62,
      remaining: 228,
      nextTier: "GRAN_RESERVA",
    });
  });

  it("is complete at the top tier", () => {
    expect(tierProgress({ points: 5400, tierFloor: 5000, nextTier: null, nextTierAt: null })).toEqual({
      fraction: 1,
      remaining: 0,
      nextTier: null,
    });
  });

  it("stays inside the bar when points fell below the floor", () => {
    expect(tierProgress({ points: 20, tierFloor: 30, nextTier: "RACIMO", nextTierAt: 80 }).fraction).toBe(0);
  });
});
