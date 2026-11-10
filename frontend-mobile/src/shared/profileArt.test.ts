import { existsSync } from "fs";
import { join } from "path";
import { DISH_ART_KEYS, NOTE_ART_KEYS, SERVING_ART_KEYS } from "@/domain/wine/wine.profile-art";
import { DISH_ART, NOTE_ART, SERVING_ART, profileArtFileName } from "./profileArt";

const ART_DIR = join(__dirname, "../../assets/images/profile-art");

describe.each([
  ["notes", NOTE_ART_KEYS, NOTE_ART],
  ["dishes", DISH_ART_KEYS, DISH_ART],
  ["serving", SERVING_ART_KEYS, SERVING_ART],
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
