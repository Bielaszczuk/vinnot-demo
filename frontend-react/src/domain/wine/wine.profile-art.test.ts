import { describe, expect, it } from "vitest";
import { DISH_ARTS, GLASS_ARTS, NOTE_ARTS, toProfileArt } from "./wine.profile-art";

describe("profile art keys", () => {
  it("lists the taxonomy keys of every set", () => {
    expect(NOTE_ARTS).toHaveLength(69);
    expect(DISH_ARTS).toHaveLength(35);
    expect([...GLASS_ARTS]).toEqual(["FLUTE", "SPARKLING_TULIP", "RED_BALLOON", "BORDEAUX", "WHITE_TULIP", "WHITE_BOWL", "ROSE", "DESSERT", "UNIVERSAL"]);
    expect(new Set([...NOTE_ARTS, ...DISH_ARTS]).size).toBe(104);
  });
});

describe("toProfileArt", () => {
  it("keeps the recognized items in order with their labels and the serving art", () => {
    const art = toProfileArt({
      aromas: [{ label: "Frambuesa", art: "RASPBERRY" }, { label: "Café", art: "COFFEE" }],
      flavors: [{ label: "Pera", art: "PEAR" }],
      pairings: [{ label: "Pollo asado con hierbas", art: "POULTRY" }],
      serving: { glass: "RED_BALLOON", decant: true, temperature: { min: 16, max: 18 } },
    });
    expect(art).toEqual({
      aromas: [{ label: "Frambuesa", art: "RASPBERRY" }, { label: "Café", art: "COFFEE" }],
      flavors: [{ label: "Pera", art: "PEAR" }],
      pairings: [{ label: "Pollo asado con hierbas", art: "POULTRY" }],
      serving: { glass: "RED_BALLOON", decant: true, temperature: { min: 16, max: 18 } },
    });
  });

  it("drops unknown keys, keys from another set and malformed items", () => {
    const art = toProfileArt({
      aromas: [
        { label: "Frambuesa", art: "RASPBERRY" },
        { label: "Unicornio", art: "UNICORN" },
        { label: "Pollo", art: "POULTRY" },
        { label: "", art: "LEMON" },
        { art: "LEMON" },
        null,
        "LEMON",
      ],
      flavors: "PEAR",
      pairings: [{ label: "Frambuesa", art: "RASPBERRY" }, { label: "Bife", art: "BEEF" }],
      serving: { glass: "COUPE", decant: "yes", temperature: { min: "16", max: 18 } },
    });
    expect(art).toEqual({
      aromas: [{ label: "Frambuesa", art: "RASPBERRY" }],
      flavors: [],
      pairings: [{ label: "Bife", art: "BEEF" }],
      serving: { glass: null, decant: false, temperature: null },
    });
  });

  it("reads a single temperature and orders a reversed range", () => {
    expect(toProfileArt({ serving: { temperature: { min: 8, max: 8 } } })?.serving?.temperature).toEqual({ min: 8, max: 8 });
    expect(toProfileArt({ serving: { temperature: { min: 18, max: 16 } } })?.serving?.temperature).toEqual({ min: 16, max: 18 });
  });

  it("tolerates a missing or malformed profile art", () => {
    for (const raw of [undefined, null, "art", 3, []]) expect(toProfileArt(raw)).toBeNull();
    expect(toProfileArt({})).toEqual({ aromas: [], flavors: [], pairings: [], serving: null });
  });
});
