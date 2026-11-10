import type { UseFormReturn } from "react-hook-form";
import {
  linkChoice,
  linkGrapes,
  type CatalogChoice,
  type CatalogOption,
} from "@/domain/wine/catalogChoice";
import type { WineSubmissionFormInput } from "@/domain/wine/wine.validators";
import { useWineSubmissionCatalog } from "./useWineSubmissionCatalog";

type Form = UseFormReturn<WineSubmissionFormInput>;

interface ChoiceField {
  value: CatalogChoice;
  options: CatalogOption[];
  onChange: (choice: CatalogChoice) => void;
}

export interface CatalogValues {
  wineryName: string;
  wineryId?: string;
  country?: string;
  countryId?: string;
  region?: string;
  regionId?: string;
  grapes?: string[];
}

export interface SubmissionCatalogFields {
  winery: ChoiceField;
  country: ChoiceField;
  region: ChoiceField;
  grapes: { value: string[]; options: CatalogOption[]; onChange: (grapes: string[]) => void };
  /** The values to send: picks, plus typed or prefilled text that matches exactly one catalog entry. */
  values: CatalogValues;
}

const choice = (name: string | undefined, id: string | undefined): CatalogChoice => ({
  id: id ?? null,
  name: name ?? "",
});

/**
 * Connects the catalog-backed submission fields to the form. The form keeps what the user picked or typed; the
 * catalog link is derived on render, so label prefill links itself once the catalog arrives and anything that
 * matches nothing stays a proposal.
 */
export function useSubmissionCatalogFields({ watch, setValue }: Form): SubmissionCatalogFields {
  const [wineryName, wineryId, country, countryId, region, regionId, grapes] = watch([
    "wineryName",
    "wineryId",
    "country",
    "countryId",
    "region",
    "regionId",
    "grapes",
  ]);
  const rawWinery = choice(wineryName, wineryId);
  const catalog = useWineSubmissionCatalog(choice(country, countryId), rawWinery.id ? "" : rawWinery.name);
  const countryOptions = catalog.countries;
  const linkedCountry = catalog.country;
  const linkedWinery = linkChoice(rawWinery, catalog.wineries);
  // A region picked for another country no longer applies.
  const keptRegionId = regionId && countryId && countryId === linkedCountry.id ? regionId : undefined;
  const linkedRegion = linkedCountry.id
    ? linkChoice(choice(region, keptRegionId), catalog.regions)
    : choice(region, undefined);
  const linkedGrapes = linkGrapes(grapes ?? [], catalog.grapes);

  const setChoice = (
    name: "wineryName" | "country" | "region",
    idName: "wineryId" | "countryId" | "regionId",
    next: CatalogChoice,
  ) => {
    setValue(name, next.name, { shouldValidate: name === "wineryName" });
    setValue(idName, next.id ?? undefined);
  };

  return {
    winery: {
      value: linkedWinery,
      options: catalog.wineries,
      onChange: (next) => setChoice("wineryName", "wineryId", next),
    },
    country: {
      value: linkedCountry,
      options: countryOptions,
      onChange: (next) => {
        if (next.id !== linkedCountry.id) setValue("regionId", undefined);
        setChoice("country", "countryId", next);
      },
    },
    region: {
      value: linkedRegion,
      options: catalog.regions,
      onChange: (next) => {
        if (linkedCountry.id && !countryId) setValue("countryId", linkedCountry.id);
        setChoice("region", "regionId", next);
      },
    },
    grapes: {
      value: linkedGrapes,
      options: catalog.grapes,
      onChange: (next) => setValue("grapes", next, { shouldValidate: true }),
    },
    values: {
      wineryName: linkedWinery.name.trim(),
      wineryId: linkedWinery.id ?? undefined,
      country: linkedCountry.name.trim() || undefined,
      countryId: linkedCountry.id ?? undefined,
      region: linkedRegion.name.trim() || undefined,
      regionId: linkedRegion.id ?? undefined,
      grapes: linkedGrapes.length ? linkedGrapes : undefined,
    },
  };
}
