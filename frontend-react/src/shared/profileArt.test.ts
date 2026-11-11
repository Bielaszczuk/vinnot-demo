import { describe, expect, it } from "vitest";
import { DISH_ARTS, GLASS_ARTS, NOTE_ARTS, SERVING_EXTRA_ARTS } from "@domain/wine/wine.profile-art";
import { TASTE_QUIZ_QUESTIONS } from "@domain/tasteQuiz/tasteQuiz.types";
import { TASTE_ARTS, TASTE_WEDGE_WASHES, dishArtUrl, noteArtUrl, quizArtUrl, servingArtUrl, tasteArtUrl, wedgeWashUrl } from "./profileArt";

describe("profile art assets", () => {
  it("bundles an illustration for every note, dish and serving key", () => {
    for (const key of NOTE_ARTS) expect(noteArtUrl(key), key).toMatch(/notes\/[a-z-]+\.webp/);
    for (const key of DISH_ARTS) expect(dishArtUrl(key), key).toMatch(/dishes\/[a-z-]+\.webp/);
    for (const key of [...GLASS_ARTS, ...SERVING_EXTRA_ARTS]) expect(servingArtUrl(key), key).toMatch(/serving\/[a-z-]+\.webp/);
    for (const key of TASTE_ARTS) expect(tasteArtUrl(key), key).toMatch(/taste\/[a-z-]+\.webp/);
  });

  it("bundles an illustration for every taste quiz option", () => {
    for (const question of TASTE_QUIZ_QUESTIONS) {
      for (const option of question.options) expect(quizArtUrl(option), option).toMatch(/quiz\/[a-z-]+\.webp/);
    }
    expect(quizArtUrl("DARK_CHOCOLATE_COFFEE")).toMatch(/quiz\/dark-chocolate-coffee\.webp/);
  });

  it("names each asset after the kebab-case key", () => {
    expect(noteArtUrl("WET_EARTH")).toMatch(/notes\/wet-earth\.webp/);
    expect(dishArtUrl("GOAT_CHEESE")).toMatch(/dishes\/goat-cheese\.webp/);
    expect(servingArtUrl("RED_BALLOON")).toMatch(/serving\/red-balloon\.webp/);
    expect(tasteArtUrl("GRAPE_CLUSTER")).toMatch(/taste\/grape-cluster\.webp/);
  });

  it("bundles the three watercolor wedge washes of the taste wheel", () => {
    expect(TASTE_WEDGE_WASHES).toEqual([1, 2, 3]);
    for (const variant of TASTE_WEDGE_WASHES) expect(wedgeWashUrl(variant)).toMatch(new RegExp(`taste/wedge-wash-${variant}\\.webp`));
  });

  it("finds no asset for an unknown key", () => {
    expect(noteArtUrl("UNICORN" as never)).toBeNull();
    expect(tasteArtUrl("UNICORN" as never)).toBeNull();
    expect(quizArtUrl("UNICORN" as never)).toBeNull();
    expect(wedgeWashUrl(9 as never)).toBeNull();
  });
});
