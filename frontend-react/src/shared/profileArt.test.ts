import { describe, expect, it } from "vitest";
import { DISH_ARTS, GLASS_ARTS, NOTE_ARTS, SERVING_EXTRA_ARTS } from "@domain/wine/wine.profile-art";
import { dishArtUrl, noteArtUrl, servingArtUrl } from "./profileArt";

describe("profile art assets", () => {
  it("bundles an illustration for every note, dish and serving key", () => {
    for (const key of NOTE_ARTS) expect(noteArtUrl(key), key).toMatch(/notes\/[a-z-]+\.webp/);
    for (const key of DISH_ARTS) expect(dishArtUrl(key), key).toMatch(/dishes\/[a-z-]+\.webp/);
    for (const key of [...GLASS_ARTS, ...SERVING_EXTRA_ARTS]) expect(servingArtUrl(key), key).toMatch(/serving\/[a-z-]+\.webp/);
  });

  it("names each asset after the kebab-case key", () => {
    expect(noteArtUrl("WET_EARTH")).toMatch(/notes\/wet-earth\.webp/);
    expect(dishArtUrl("GOAT_CHEESE")).toMatch(/dishes\/goat-cheese\.webp/);
    expect(servingArtUrl("RED_BALLOON")).toMatch(/serving\/red-balloon\.webp/);
  });

  it("finds no asset for an unknown key", () => {
    expect(noteArtUrl("UNICORN" as never)).toBeNull();
  });
});
