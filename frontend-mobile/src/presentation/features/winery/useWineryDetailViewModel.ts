import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useWinery, useUpdateWineryCoordinates, useWineryWines } from "@/presentation/hooks/queries/winery";
import { useGeocoding } from "@/presentation/hooks/useGeocoding";
import { useDetailViewTracking } from "@/presentation/hooks/useDetailViewTracking";
import type { Winery } from "@/domain/winery/winery.types";
import { retryableLoadError } from "@/presentation/feedback/illustratedState";

export function useWineryDetailViewModel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wineryQuery = useWinery(id);
  useDetailViewTracking("WINERY", id);
  const winesQuery = useWineryWines(id, 0, 20);
  const winery = wineryQuery.data;
  const winesData = winesQuery.data;
  const isLoading = wineryQuery.isLoading;
  const isError = wineryQuery.isError;
  const isLoadingWines = winesQuery.isLoading;
  const updateCoordinates = useUpdateWineryCoordinates();
  const { geocodeAddress } = useGeocoding();
  const [resolvedWinery, updateResolvedWinery] = useState<Winery | null>(null);
  const geocodeAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    updateResolvedWinery(winery ?? null);
    geocodeAttemptedRef.current = null;
  }, [winery]);

  useEffect(() => {
    if (!resolvedWinery || !id) return;
    if (resolvedWinery.latitude && resolvedWinery.longitude) return;

    const requestKey = `${id}:${resolvedWinery.name}`;
    if (geocodeAttemptedRef.current === requestKey) return;
    geocodeAttemptedRef.current = requestKey;

    const query = [resolvedWinery.name, resolvedWinery.regionName, resolvedWinery.countryName]
      .filter(Boolean)
      .join(", ");
    if (!query.trim()) return;

    async function geocodeAndPersistCoordinates() {
      const result = await geocodeAddress(query);
      if (!result.ok || !result.location) return;

      const nextAddress = resolvedWinery?.address || result.location.formattedAddress || null;
      updateResolvedWinery((current) =>
        current
          ? {
              ...current,
              latitude: result.location!.latitude,
              longitude: result.location!.longitude,
              address: nextAddress,
            }
          : current,
      );

      await updateCoordinates
        .mutateAsync({
          id: id!,
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          address: nextAddress,
        })
        .catch(() => undefined);
    }

    void geocodeAndPersistCoordinates();
  }, [geocodeAddress, id, resolvedWinery, updateCoordinates]);

  const displayWinery = resolvedWinery ?? winery ?? null;
  const wines = winesData?.items ?? [];
  const address =
    displayWinery?.address ??
    [displayWinery?.subregion, displayWinery?.regionName, displayWinery?.countryName]
      .filter(Boolean)
      .join(", ");
  const mapQuery =
    displayWinery?.latitude && displayWinery?.longitude
      ? `${displayWinery.latitude},${displayWinery.longitude}`
      : address || displayWinery?.name || "";

  function refresh() {
    void Promise.all([wineryQuery.refetch(), winesQuery.refetch()]);
  }

  return {
    id,
    isLoading,
    isError,
    loadError: retryableLoadError(isError, wineryQuery.error),
    retry: () => void wineryQuery.refetch(),
    isLoadingWines,
    isFetching: wineryQuery.isFetching || winesQuery.isFetching,
    displayWinery,
    wines,
    address,
    mapQuery,
    refresh,
  };
}
