import type { TastingNotes, TastingNotesInput, WineAward, WineAwardInput } from "./wine.mappers.types";

export function mapTastingNotesFromDto(dto: TastingNotesInput): TastingNotes {
  return {
    appearance: dto.appearance,
    aroma: dto.aroma ?? [],
    palate: dto.palate ?? [],
    finish: dto.finish,
    body: dto.body,
    sweetness: dto.sweetness,
    tannins: dto.tannins,
    acidity: dto.acidity,
  };
}

export function mapWineAwardFromDto(dto: WineAwardInput): WineAward {
  return {
    name: dto.name,
    year: dto.year,
    medal: dto.medal ?? null,
  };
}
