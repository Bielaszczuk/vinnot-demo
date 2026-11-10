import { describe, expect, it } from "@jest/globals";
import i18next, { type TFunction } from "i18next";
import { BADGE_TIER_KEYS } from "@/domain/points/badgeTiers";
import esAR from "./locales/es-AR.json";
import enUS from "./locales/en-US.json";

async function translator(lng: "es-AR" | "en-US"): Promise<TFunction> {
  const instance = i18next.createInstance();
  await instance.init({
    lng,
    fallbackLng: false,
    resources: { "es-AR": { translation: esAR }, "en-US": { translation: enUS } },
    interpolation: { escapeValue: false },
  });
  return instance.t;
}

describe("seal tier names", () => {
  it("names every tier in Spanish and in English", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    expect(BADGE_TIER_KEYS.map((tier) => es(`points.tiers.${tier}`))).toEqual([
      "Brote", "Parra", "Racimo", "Vendimia", "Lagar", "Barrica",
      "Crianza", "Reserva", "Gran Reserva", "Gran Enófilo", "Vinnot",
    ]);
    expect(BADGE_TIER_KEYS.map((tier) => en(`points.tiers.${tier}`))).toEqual([
      "Bud", "Vine Leaf", "Cluster", "Harvest", "Wine Press", "Barrel",
      "Aging", "Reserve", "Grand Reserve", "Connoisseur", "Vinnot",
    ]);
  });

  it("reads naturally around the top tier in the celebration and the welcome card", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    expect(es("points.celebration.title", { tier: es("points.tiers.VINNOT") })).toBe("Llegaste a Vinnot");
    expect(en("points.celebration.title", { tier: en("points.tiers.VINNOT") })).toBe("You reached Vinnot");
    expect(es("points.welcome.body", { points: "48 puntos", tier: es("points.tiers.PARRA") }))
      .toBe("Ya tenés 48 puntos y el sello Parra.");
    expect(en("points.welcome.body", { points: "48 points", tier: en("points.tiers.PARRA") }))
      .toBe("You already have 48 points and the Vine Leaf seal.");
  });
});
