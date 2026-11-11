import { existsSync } from "fs";
import { join } from "path";
import { DISH_ART_KEYS, NOTE_ART_KEYS, SERVING_ART_KEYS } from "@/domain/wine/wine.profile-art";
import { TASTE_ART_KEYS, TASTE_FAMILIES, TASTE_TRAITS } from "@/domain/social/social.types";
import { TASTE_QUIZ_OPTION_KEYS } from "@/domain/tasteQuiz/tasteQuiz.types";
import {
  DISH_ART,
  NOTE_ART,
  SERVING_ART,
  TASTE_ART,
  TASTE_WEDGE_WASHES,
  TASTE_QUIZ_ART,
  profileArtFileName,
  tasteFamilyArt,
  tasteTraitArt,
} from "./profileArt";

const ART_DIR = join(__dirname, "../../assets/images/profile-art");

describe.each([
  ["notes", NOTE_ART_KEYS, NOTE_ART],
  ["dishes", DISH_ART_KEYS, DISH_ART],
  ["serving", SERVING_ART_KEYS, SERVING_ART],
  ["taste", TASTE_ART_KEYS, TASTE_ART],
  ["quiz", TASTE_QUIZ_OPTION_KEYS, TASTE_QUIZ_ART],
] as const)("%s art", (folder, keys, assets) => {
  it("maps every key, and only the keys, to a bundled asset", () => {
    expect(Object.keys(assets).sort()).toEqual([...keys].sort());
    for (const key of keys) expect((assets as Record<string, unknown>)[key]).toBeDefined();
  });

  it("has a kebab-case webp file for every key", () => {
    const missing = keys.filter((key) => !existsSync(join(ART_DIR, folder, profileArtFileName(key))));
    expect(missing).toEqual([]);
  });
});

it("names files in kebab case", () => {
  expect(profileArtFileName("WET_EARTH")).toBe("wet-earth.webp");
  expect(profileArtFileName("TEA")).toBe("tea.webp");
});

describe("taste profile art", () => {
  it("paints the taste wheel wedges with the three watercolor wedge textures, in order", () => {
    expect(TASTE_WEDGE_WASHES).toEqual([TASTE_ART.WEDGE_WASH_1, TASTE_ART.WEDGE_WASH_2, TASTE_ART.WEDGE_WASH_3]);
  });

  it("draws each structure trait with its note or taste illustration", () => {
    expect(TASTE_TRAITS.map(tasteTraitArt)).toEqual([NOTE_ART.LEMON, TASTE_ART.BODY, TASTE_ART.TANNIN, NOTE_ART.HONEY]);
  });

  it("draws each aroma family with its note illustration", () => {
    expect(TASTE_FAMILIES.map(tasteFamilyArt)).toEqual([
      NOTE_ART.MIXED_FRUIT,
      NOTE_ART.VIOLET,
      NOTE_ART.FRESH_HERBS,
      NOTE_ART.BLACK_PEPPER,
      NOTE_ART.OAK,
      NOTE_ART.MINERAL,
    ]);
  });
});
