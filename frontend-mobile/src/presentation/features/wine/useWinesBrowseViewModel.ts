import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { locationService } from "@/application/services/location.service";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useWineCatalogPagination } from "./useWineCatalogPagination";
import {
  useCountries,
  useGrapeTypes,
  useRegions,
  useWineTypes,
} from "@/presentation/hooks/queries/wine";
import { useCellar } from "@/presentation/hooks/queries/cellar";
import { useDebounce, useGeolocation } from "@/presentation/hooks/ui";
import { toWineType, type WineFilter, type WineType } from "@/domain/wine/wine.types";
import type { OpenFilter } from "@/presentation/features/wine";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { wineListSubtitle } from "./catalogCountLabel";

const PAGE_SIZE = 20;
const INITIAL_COUNTRY_TIMEOUT_MS = 10_000;

export function useWinesBrowseViewModel() {
  const params = useLocalSearchParams<{ type?: string; grape?: string }>();
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
  const { formatNumber } = useFormatters();
  const [search, updateSearch] = useState("");
  const [selectedType, chooseType] = useState<WineType | undefined>();
  const [selectedGrape, chooseGrape] = useState("");
  const [selectedCountry, chooseCountry] = useState("");
  const [selectedRegion, chooseRegion] = useState("");
  const [openFilter, chooseOpenFilter] = useState<OpenFilter>(null);
  const [filtersExpanded, updateFiltersExpanded] = useState(false);
  const geo = useGeolocation();
  const hasAppliedGeoCountry = useRef(false);
  const [initialCountryResolved, finishInitialCountry] = useState(false);
  const countryTouchedByUser = useRef(false);
  const debouncedSearch = useDebounce(search, 400);
  const trimmedDebouncedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedDebouncedSearch.length >= 2 ? trimmedDebouncedSearch : undefined;

  const filter = useMemo<WineFilter>(
    () => ({
      search: effectiveSearch,
      type: selectedType,
      grapeVariety: selectedGrape || undefined,
      country: selectedCountry || undefined,
      region: selectedRegion || undefined,
    }),
    [effectiveSearch, selectedCountry, selectedGrape, selectedRegion, selectedType],
  );

  const pagination = useWineCatalogPagination(
    filter,
    user?.id,
    isAuthenticated && initialCountryResolved,
    PAGE_SIZE,
  );
  const { page, isFetching } = pagination;
  const { currentData: cellarEntries } = useCellar({ enabled: isAuthenticated });
  const { data: grapeTypes = [] } = useGrapeTypes();
  const { data: wineTypes = [] } = useWineTypes();
  const {
    data: countries = [],
    isSuccess: countriesReady,
    isError: countriesFailed,
  } = useCountries();
  const { data: allRegions = [] } = useRegions();

  const countryOptions = useMemo(() => countries.map((country) => country.name), [countries]);
  const regionOptions = useMemo(() => {
    if (!selectedCountry) return [];
    const selectedCountryEntity = countries.find(
      (country) => country.name === selectedCountry || country.id === selectedCountry,
    );
    if (!selectedCountryEntity) return [];
    return allRegions
      .filter((region) => region.countryId === selectedCountryEntity.id)
      .map((region) => region.name)
      .sort();
  }, [allRegions, countries, selectedCountry]);
  const cellarWineIds = useMemo(
    () => new Set(isAuthenticated ? cellarEntries.map((entry) => entry.wine.id) : []),
    [cellarEntries, isAuthenticated],
  );
  const trimmedSearch = search.trim();
  const isSearchDebouncing = trimmedSearch.length >= 2 && trimmedSearch !== debouncedSearch.trim();
  const isSearching = isSearchDebouncing || (trimmedSearch.length >= 2 && isFetching && page === 0);

  useEffect(() => {
    if (initialCountryResolved) return;
    // Android may need longer for a GPS fix after reopening. Stop blocking the
    // catalog, but keep its pending country lookup. Preserve the iOS deadline.
    const timer = setTimeout(() => {
      if (Platform.OS !== "android") hasAppliedGeoCountry.current = true;
      finishInitialCountry(true);
    }, INITIAL_COUNTRY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [initialCountryResolved]);

  useEffect(() => {
    if (hasAppliedGeoCountry.current || countryTouchedByUser.current || selectedCountry) return;
    if (geo.error || countriesFailed || (countriesReady && countries.length === 0)) {
      hasAppliedGeoCountry.current = true;
      finishInitialCountry(true);
      return;
    }
    if (
      countries.length === 0 ||
      typeof geo.latitude !== "number" ||
      typeof geo.longitude !== "number"
    )
      return;

    let cancelled = false;

    async function applyCountryFromLocation() {
      try {
        const place = await locationService.resolveCountry({
          latitude: geo.latitude!,
          longitude: geo.longitude!,
        });
        if (cancelled || hasAppliedGeoCountry.current || countryTouchedByUser.current) return;

        const countryName = place?.country?.trim().toLowerCase();
        const countryCode = place?.countryCode?.trim().toLowerCase();
        const matchedCountry = countries.find((country) => {
          const nameMatches = countryName && country.name.trim().toLowerCase() === countryName;
          const codeMatches = countryCode && country.code.trim().toLowerCase() === countryCode;
          return nameMatches || codeMatches;
        });

        hasAppliedGeoCountry.current = true;
        if (matchedCountry) chooseCountry(matchedCountry.name);
        finishInitialCountry(true);
      } catch {
        if (cancelled || hasAppliedGeoCountry.current || countryTouchedByUser.current) return;
        hasAppliedGeoCountry.current = true;
        finishInitialCountry(true);
      }
    }

    void applyCountryFromLocation();

    return () => {
      cancelled = true;
    };
  }, [
    countries,
    countriesReady,
    countriesFailed,
    geo.latitude,
    geo.longitude,
    geo.error,
    selectedCountry,
  ]);

  useEffect(() => {
    const nextType = toWineType(params.type);
    if (nextType) {
      chooseType(nextType);
    }
    if (params.grape) {
      chooseGrape(params.grape);
    }
  }, [params.grape, params.type]);

  const hasActiveFilters =
    !!filter.search ||
    !!filter.type ||
    !!filter.grapeVariety ||
    !!filter.country ||
    !!filter.region;

  function clearFilters() {
    updateSearch("");
    chooseType(undefined);
    chooseGrape("");
    chooseCountry("");
    chooseRegion("");
    chooseOpenFilter(null);
    updateFiltersExpanded(false);
    countryTouchedByUser.current = true;
    finishInitialCountry(true);
  }

  function toggleFilters() {
    updateFiltersExpanded((current) => {
      if (current) chooseOpenFilter(null);
      return !current;
    });
  }

  function selectCountry(value: string) {
    countryTouchedByUser.current = true;
    finishInitialCountry(true);
    chooseCountry(value);
    chooseRegion("");
  }

  const isLoading = isAuthenticated && (!initialCountryResolved || pagination.isLoading);
  const totalLabel = wineListSubtitle({
    status: { isError: pagination.isError, isLoading, hasData: !!pagination.data },
    total: pagination.data?.total ?? pagination.wines.length,
    filters: { search, type: selectedType, grape: selectedGrape, country: selectedCountry, region: selectedRegion },
    t,
    format: formatNumber,
  });

  return {
    search,
    setSearch: updateSearch,
    selectedType,
    setSelectedType: chooseType,
    selectedGrape,
    setSelectedGrape: chooseGrape,
    selectedCountry,
    selectedRegion,
    setSelectedRegion: chooseRegion,
    openFilter,
    setOpenFilter: chooseOpenFilter,
    filtersExpanded,
    toggleFilters,
    ...pagination,
    isLoading,
    totalLabel,
    isSearching,
    cellarWineIds,
    grapeTypes,
    wineTypes,
    countryOptions,
    regionOptions,
    hasActiveFilters,
    clearFilters,
    selectCountry,
  };
}
