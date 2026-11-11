import type { TasteQuizOptionKey } from "@domain/tasteQuiz/tasteQuiz.types";
import type { DishArt, GlassArt, NoteArt, ServingExtraArt } from "@domain/wine/wine.profile-art";

/*
 * Every illustration is a bundler import with an immutable, content-hashed URL. The glob picks up new files by
 * name, so an asset named after a key's kebab case (WET_EARTH -> wet-earth.webp) needs no code change.
 */
const notes = import.meta.glob<string>("./assets/profile-art/notes/*.webp", { eager: true, import: "default" });
const dishes = import.meta.glob<string>("./assets/profile-art/dishes/*.webp", { eager: true, import: "default" });
const serving = import.meta.glob<string>("./assets/profile-art/serving/*.webp", { eager: true, import: "default" });
const taste = import.meta.glob<string>("./assets/profile-art/taste/*.webp", { eager: true, import: "default" });
const quiz = import.meta.glob<string>("./assets/profile-art/quiz/*.webp", { eager: true, import: "default" });

/** The taste-profile illustrations that have no aroma note of their own: the wheel emblem and two structure traits. */
export const TASTE_ARTS = ["GRAPE_CLUSTER", "WINE_GLASSES", "VINEYARD", "BODY", "TANNIN"] as const;
export type TasteArt = (typeof TASTE_ARTS)[number];

/** The watercolor washes the taste wheel paints its wedges with: white pixels whose alpha is the pigment density. */
export const TASTE_WEDGE_WASHES = [1, 2, 3] as const;
export type TasteWedgeWash = (typeof TASTE_WEDGE_WASHES)[number];

function lookup(assets: Record<string, string>, folder: string, key: string): string | null {
  return assets[`./assets/profile-art/${folder}/${key.toLowerCase().replace(/_/g, "-")}.webp`] ?? null;
}

/** The illustration of an aroma or flavor note; null when none is bundled. */
export function noteArtUrl(key: NoteArt): string | null {
  return lookup(notes, "notes", key);
}

/** The illustration of a paired dish; null when none is bundled. */
export function dishArtUrl(key: DishArt): string | null {
  return lookup(dishes, "dishes", key);
}

/** The illustration of a glass, the decanter or the cellar; null when none is bundled. */
export function servingArtUrl(key: GlassArt | ServingExtraArt): string | null {
  return lookup(serving, "serving", key);
}

/** The illustration of a taste-profile emblem or structure trait; null when none is bundled. */
export function tasteArtUrl(key: TasteArt): string | null {
  return lookup(taste, "taste", key);
}

/** The wedge wash of one texture variant; null when none is bundled. */
export function wedgeWashUrl(variant: TasteWedgeWash): string | null {
  return taste[`./assets/profile-art/taste/wedge-wash-${variant}.webp`] ?? null;
}

/** The illustration of a taste quiz option; null when none is bundled. */
export function quizArtUrl(key: TasteQuizOptionKey): string | null {
  return lookup(quiz, "quiz", key);
}
