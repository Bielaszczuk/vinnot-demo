import { describe, expect, it } from "@jest/globals";
import { CELLAR_VISIBILITIES, TASTE_FAMILIES, TASTE_TRAITS, TASTE_WHEEL_VIEWS } from "@/domain/social/social.types";
import esAR from "./locales/es-AR.json";
import enUS from "./locales/en-US.json";

function keysOf(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key));
}

describe("social copy", () => {
  it("has every social text in Spanish and in English", () => {
    expect(keysOf(enUS.social).sort()).toEqual(keysOf(esAR.social).sort());
    for (const key of keysOf(esAR.social)) {
      const read = (root: unknown) => key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root);
      expect(String(read(enUS.social))).not.toBe("");
      expect(String(read(esAR.social))).not.toBe("");
    }
  });

  it("names the Home sections and the cellar visibility options as agreed", () => {
    expect(esAR.social.feedTitle).toBe("De gente que seguís");
    expect(esAR.social.suggestionsTitle).toBe("Personas para seguir");
    expect(esAR.social.seeAll).toBe("Ver todo");
    expect(CELLAR_VISIBILITIES.map((option) => esAR.social.visibility[option])).toEqual([
      "Pública",
      "Solo seguidores",
      "Privada",
    ]);
    expect(CELLAR_VISIBILITIES.map((option) => enUS.social.visibility[option])).toEqual([
      "Public",
      "Followers only",
      "Private",
    ]);
  });

  it("names the new follower point in both languages", () => {
    expect(esAR.points.sources.FOLLOWER_GAINED).toBe("Nuevo seguidor");
    expect(enUS.points.sources.FOLLOWER_GAINED).toBe("New follower");
    expect(esAR.points.rules.followerGained).toBeTruthy();
    expect(enUS.points.rules.followerGained).toBeTruthy();
  });

  it("names the taste profile traits, levels and aroma families as agreed", () => {
    const levels = (copy: typeof esAR) =>
      TASTE_TRAITS.map((trait) => {
        const words = copy.social.taste.levels[trait];
        return `${copy.social.taste.traits[trait]}: ${words.LOW}/${words.MEDIUM}/${words.HIGH}`;
      });
    expect(levels(esAR)).toEqual([
      "Acidez: Baja/Media/Alta",
      "Cuerpo: Bajo/Medio/Alto",
      "Taninos: Bajos/Medios/Altos",
      "Dulzor: Seco/Semiseco/Dulce",
    ]);
    expect(levels(enUS)).toEqual([
      "Acidity: Low/Medium/High",
      "Body: Low/Medium/High",
      "Tannin: Low/Medium/High",
      "Sweetness: Dry/Off-dry/Sweet",
    ]);
    expect(TASTE_FAMILIES.map((family) => esAR.social.taste.families[family])).toEqual([
      "Frutado",
      "Floral",
      "Herbal",
      "Especiado",
      "Madera",
      "Mineral",
    ]);
    expect(TASTE_FAMILIES.map((family) => enUS.social.taste.families[family])).toEqual([
      "Fruity",
      "Floral",
      "Herbal",
      "Spicy",
      "Oak",
      "Mineral",
    ]);
    expect([esAR.social.taste.structureTitle, esAR.social.taste.aromasTitle, esAR.social.taste.aromasTitleOwn]).toEqual([
      "Estructura",
      "Aromas que prefiere",
      "Aromas que preferís",
    ]);
    expect([enUS.social.taste.structureTitle, enUS.social.taste.aromasTitle, enUS.social.taste.aromasTitleOwn]).toEqual([
      "Structure",
      "Preferred aromas",
      "Your preferred aromas",
    ]);
  });

  it("names the taste wheel views and counts its wines as agreed", () => {
    expect(TASTE_WHEEL_VIEWS.map((view) => esAR.social.taste.views[view])).toEqual(["Uvas", "Estilos", "Regiones"]);
    expect(TASTE_WHEEL_VIEWS.map((view) => enUS.social.taste.views[view])).toEqual(["Grapes", "Styles", "Regions"]);
    expect([esAR.social.taste.ratedWines_one, esAR.social.taste.ratedWines_other]).toEqual([
      "{{count, number}} vino",
      "{{count, number}} vinos",
    ]);
    expect([enUS.social.taste.ratedWines_one, enUS.social.taste.ratedWines_other]).toEqual([
      "{{count, number}} wine",
      "{{count, number}} wines",
    ]);
  });
});
