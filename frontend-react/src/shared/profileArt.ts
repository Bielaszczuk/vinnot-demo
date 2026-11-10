import type { DishArt, GlassArt, NoteArt, ServingExtraArt } from "@domain/wine/wine.profile-art";

/*
 * Every illustration is a bundler import with an immutable, content-hashed URL. The glob picks up new files by
 * name, so an asset named after a key's kebab case (WET_EARTH -> wet-earth.webp) needs no code change.
 */
const notes = import.meta.glob<string>("./assets/profile-art/notes/*.webp", { eager: true, import: "default" });
const dishes = import.meta.glob<string>("./assets/profile-art/dishes/*.webp", { eager: true, import: "default" });
const serving = import.meta.glob<string>("./assets/profile-art/serving/*.webp", { eager: true, import: "default" });

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
