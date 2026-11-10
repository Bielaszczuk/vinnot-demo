import { DISH_ART_KEYS, GLASS_ART_KEYS, NOTE_ART_KEYS, SERVING_ART_KEYS, toProfileArt } from "./wine.profile-art";
import { mapAiWineProfile } from "./wine.mappers";

describe("profile art keys", () => {
  it("lists the taxonomy of notes, dishes and serving art", () => {
    expect(NOTE_ART_KEYS).toHaveLength(69);
    expect(NOTE_ART_KEYS[0]).toBe("DRIED_FRUIT");
    expect(NOTE_ART_KEYS[NOTE_ART_KEYS.length - 1]).toBe("MIXED_FRUIT");
    expect(DISH_ART_KEYS).toHaveLength(35);
    expect(GLASS_ART_KEYS).toEqual(["FLUTE", "SPARKLING_TULIP", "RED_BALLOON", "BORDEAUX", "WHITE_TULIP", "WHITE_BOWL", "ROSE", "DESSERT", "UNIVERSAL"]);
    expect(SERVING_ART_KEYS).toEqual([...GLASS_ART_KEYS, "DECANTER", "OPEN_BOTTLE", "CELLAR"]);
  });
});

describe("toProfileArt", () => {
  it("keeps known items in order and drops unknown keys", () => {
    const art = toProfileArt({
      aromas: [
        { label: "Café", art: "COFFEE" },
        { label: "Algo raro", art: "UNICORN" },
        { label: "Hierbas silvestres", art: "FRESH_HERBS" },
        { label: "Limón", art: "LEMON" },
      ],
      flavors: [{ label: "Pera", art: "PEAR" }, { label: "Pollo", art: "POULTRY" }],
      pairings: [{ label: "Pollo asado", art: "POULTRY" }, { label: "Pera", art: "PEAR" }],
      serving: { glass: "RED_BALLOON", decant: true, temperature: { min: 16, max: 18 } },
    });

    expect(art).toEqual({
      aromas: [
        { label: "Café", art: "COFFEE" },
        { label: "Hierbas silvestres", art: "FRESH_HERBS" },
        { label: "Limón", art: "LEMON" },
      ],
      flavors: [{ label: "Pera", art: "PEAR" }],
      pairings: [{ label: "Pollo asado", art: "POULTRY" }],
      serving: { glass: "RED_BALLOON", decant: true, temperature: { min: 16, max: 18 } },
    });
  });

  it("drops malformed items and repeated art", () => {
    const art = toProfileArt({
      aromas: [null, "COFFEE", { art: "COFFEE" }, { label: "  ", art: "COFFEE" }, { label: "Café", art: "COFFEE" },
        { label: "Moka", art: "COFFEE" }],
    });

    expect(art?.aromas).toEqual([{ label: "Café", art: "COFFEE" }]);
  });

  it("tolerates a partial or malformed serving", () => {
    expect(toProfileArt({})?.serving).toEqual({ glass: null, decant: false, temperature: null });
    expect(toProfileArt({ serving: { glass: "MUG", decant: "yes", temperature: { min: "16" } } })?.serving)
      .toEqual({ glass: null, decant: false, temperature: null });
    expect(toProfileArt({ serving: { temperature: { min: 18, max: 16 } } })?.serving.temperature)
      .toEqual({ min: 16, max: 18 });
  });

  it.each([undefined, null, "art", 42, []])("returns null for a missing or malformed value (%p)", (raw) => {
    expect(toProfileArt(raw)).toBeNull();
  });
});

describe("mapAiWineProfile profileArt", () => {
  it("maps the response art and drops unknown keys", () => {
    const profile = mapAiWineProfile({
      wineId: "w1",
      generatedAt: "2026-11-01T00:00:00Z",
      profileArt: { aromas: [{ label: "Frambuesa", art: "RASPBERRY" }, { label: "X", art: "NOPE" }] },
    });

    expect(profile.profileArt?.aromas).toEqual([{ label: "Frambuesa", art: "RASPBERRY" }]);
  });

  it("leaves profileArt null when the response has none", () => {
    expect(mapAiWineProfile({ wineId: "w1", generatedAt: "2026-11-01T00:00:00Z" }).profileArt).toBeNull();
  });
});
