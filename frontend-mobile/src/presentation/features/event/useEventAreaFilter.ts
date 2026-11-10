import { useCallback, useState } from "react";
import { useGeocoding } from "@/presentation/hooks/useGeocoding";

export type EventAreaSelection = {
  label: string;
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
};

export function useEventAreaFilter(selectedCountry?: string) {
  const { geocodeAddress, isGeocoding, error } = useGeocoding();
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<EventAreaSelection | null>(null);

  const searchArea = useCallback(async () => {
    const area = query.trim();
    if (!area) return false;

    const result = await geocodeAddress(
      selectedCountry ? `${area}, ${selectedCountry}` : area,
    );
    if (!result.ok || !result.location) return false;

    const { location } = result;
    setSelection({
      label: location.formattedAddress,
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city ?? undefined,
      region: location.region ?? undefined,
      country: location.country ?? undefined,
    });
    return true;
  }, [geocodeAddress, query, selectedCountry]);

  const clearArea = useCallback(() => {
    setQuery("");
    setSelection(null);
  }, []);

  return {
    query,
    setQuery,
    selection,
    searchArea,
    clearArea,
    isSearching: isGeocoding,
    error,
  };
}
