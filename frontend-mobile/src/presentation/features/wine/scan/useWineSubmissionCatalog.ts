import { useMemo } from "react";
import { linkChoice, type CatalogChoice, type CatalogOption } from "@/domain/wine/catalogChoice";
import { useCountries } from "@/presentation/hooks/queries/wine/useCountries";
import { useGrapeTypes } from "@/presentation/hooks/queries/wine/useGrapeTypes";
import { useRegions } from "@/presentation/hooks/queries/wine/useRegions";
import { useWineries } from "@/presentation/hooks/queries/winery";
import { useDebounce } from "@/presentation/hooks/ui";

const WINERY_SUGGESTIONS = 10;

export interface WineSubmissionCatalog {
  countries: CatalogOption[];
  /** The country value linked to the catalog when its name matches exactly one country. */
  country: CatalogChoice;
  /** Only the regions of that catalog country; empty while the country is a proposal. */
  regions: CatalogOption[];
  grapes: CatalogOption[];
  /** Catalog wineries matching the latest typed winery name. */
  wineries: CatalogOption[];
  wineriesLoading: boolean;
}

const toOption = ({ id, name }: CatalogOption): CatalogOption => ({ id, name });

/** Catalog lookups for the submission form; reuses the shared reference and winery queries. */
export function useWineSubmissionCatalog(country: CatalogChoice, winerySearch: string): WineSubmissionCatalog {
  const countries = useCountries();
  const countryOptions = useMemo(() => countries.data.map(toOption), [countries.data]);
  const linkedCountry = linkChoice(country, countryOptions);
  const countryId = linkedCountry.id;
  const regions = useRegions(countryId ?? undefined, Boolean(countryId));
  const grapes = useGrapeTypes();
  const search = useDebounce(winerySearch.trim(), 300);
  const wineries = useWineries(search ? { search } : undefined, 0, WINERY_SUGGESTIONS, Boolean(search));

  return {
    countries: countryOptions,
    country: linkedCountry,
    regions: useMemo(
      () => (countryId ? regions.data.filter((region) => region.countryId === countryId).map(toOption) : []),
      [countryId, regions.data],
    ),
    grapes: useMemo(() => grapes.data.map(toOption), [grapes.data]),
    wineries: useMemo(
      () => (search ? (wineries.data?.wineries ?? []).map(toOption) : []),
      [search, wineries.data],
    ),
    wineriesLoading: wineries.isFetching,
  };
}
