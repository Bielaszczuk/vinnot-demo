import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWineRoutes } from "@/presentation/hooks/queries/wineRoute";
import { useCountries, useRegions } from "@/presentation/hooks/queries/wine";
import { useDebounce } from "@/presentation/hooks/ui";
import { useCountryName } from "@/presentation/hooks/useCountryName";
import type { RouteDifficulty, WineRoute } from "@/domain/route/route.types";

const PAGE_SIZE = 20;

export function useWineRoutesListViewModel() {
  const countryName = useCountryName();
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<RouteDifficulty | "ALL">("ALL");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [loadedRoutes, updateLoadedRoutes] = useState<WineRoute[]>([]);
  const [isRefreshing, updateIsRefreshing] = useState(false);
  const refreshFirstPagePending = useRef(false);
  const debouncedSearch = useDebounce(search.trim().toLowerCase(), 300);

  const routesQuery = useWineRoutes(undefined, page, PAGE_SIZE);
  const { refetch: refetchRoutes } = routesQuery;
  const { data: countries = [] } = useCountries();
  const { data: regions = [] } = useRegions();
  const refetchFirstPage = useCallback(async () => {
    try {
      const result = await refetchRoutes();
      if (result.data) updateLoadedRoutes(result.data.routes);
    } catch {
      // RTK Query exposes the failed refresh through the existing query state.
    } finally {
      updateIsRefreshing(false);
    }
  }, [refetchRoutes]);

  useEffect(() => {
    const routesData = routesQuery.data;
    if (!routesData) return;

    updateLoadedRoutes((current) => {
      if (page === 0) return routesData.routes;
      const seen = new Set(current.map((route) => route.id));
      return [...current, ...routesData.routes.filter((route) => !seen.has(route.id))];
    });
  }, [page, routesQuery.data]);

  useEffect(() => {
    if (page !== 0 || !refreshFirstPagePending.current) return;
    refreshFirstPagePending.current = false;
    void refetchFirstPage();
  }, [page, refetchFirstPage]);

  const countryOptions = useMemo(() => countries.map((country) => country.name), [countries]);
  const selectedCountryEntity = countries.find(
    (country) => country.name === selectedCountry || country.id === selectedCountry,
  );
  const regionOptions = useMemo(() => {
    if (!selectedCountryEntity) return [];
    return regions
      .filter((region) => region.countryId === selectedCountryEntity.id)
      .map((region) => region.name)
      .sort();
  }, [regions, selectedCountryEntity]);

  const filteredRoutes = useMemo(() => {
    return loadedRoutes.filter((route) => {
      const matchesDifficulty =
        selectedDifficulty === "ALL" || route.difficulty === selectedDifficulty;
      const matchesCountry = !selectedCountry || route.country === selectedCountry;
      const matchesRegion = !selectedRegion || route.region === selectedRegion;
      const haystack = [route.name, route.description, route.region, route.country, countryName(route.country), ...route.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesDifficulty &&
        matchesCountry &&
        matchesRegion &&
        (!debouncedSearch || haystack.includes(debouncedSearch))
      );
    });
  }, [countryName, debouncedSearch, loadedRoutes, selectedCountry, selectedDifficulty, selectedRegion]);

  const hasActiveFilters = !!(
    search ||
    selectedDifficulty !== "ALL" ||
    selectedCountry ||
    selectedRegion
  );

  function clearFilters() {
    setSearch("");
    setSelectedDifficulty("ALL");
    setSelectedCountry(null);
    setSelectedRegion(null);
  }

  function selectCountry(country: string | null) {
    setSelectedCountry(country);
    setSelectedRegion(null);
  }

  function loadMore() {
    if (routesQuery.isFetching || !routesQuery.data?.pagination.hasNext) return;
    setPage((current) => current + 1);
  }

  function refresh() {
    if (isRefreshing) return;
    updateIsRefreshing(true);

    if (page === 0) {
      void refetchFirstPage();
      return;
    }

    refreshFirstPagePending.current = true;
    setPage(0);
  }

  return {
    search,
    setSearch,
    selectedDifficulty,
    setSelectedDifficulty,
    selectedCountry,
    selectedRegion,
    setSelectedRegion,
    countryOptions,
    regionOptions,
    filteredRoutes,
    loadedRoutes,
    routesQuery,
    page,
    isRefreshing,
    hasActiveFilters,
    clearFilters,
    selectCountry,
    loadMore,
    refresh,
  };
}
