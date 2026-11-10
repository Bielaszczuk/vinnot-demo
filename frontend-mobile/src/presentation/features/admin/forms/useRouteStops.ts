/**
 * Stops of the route sheet: catalog wineries found by name (or created on the spot), manual
 * stops typed in labelled fields, geocoding and the map pin. Opening the sheet for another
 * route starts afresh, and a late geocoder answer for a previous route is ignored.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminRouteStop, AdminWinery } from "@/domain/admin/admin.types";
import {
  emptyManualStop,
  normalizeStops,
  reorderStops,
  toManualRouteStop,
  validateManualStop,
  type ManualStopDraft,
  type ManualStopError,
} from "@/domain/admin/adminRouteDraft";
import { useAdminWinerySearch } from "@/presentation/hooks/queries/admin";
import { useDebounce } from "@/presentation/hooks/ui";
import { useGeocoding } from "@/presentation/hooks/useGeocoding";
import { useToast } from "@/presentation/providers/ToastProvider";
import { STOP_WINERY_MIN_QUERY } from "../AdminRouteSheet.contracts";

/** Minutes a winery visit takes by default. */
const WINERY_STOP_MINUTES = 60;

export function useRouteStops(visible: boolean, routeKey: string, initialStops?: AdminRouteStop[] | null) {
  const { t } = useTranslation();
  const { showSuccess, showToast } = useToast();
  const { geocodeAddress, isGeocoding } = useGeocoding();
  const revision = useRef(0);
  const [stops, updateStops] = useState<AdminRouteStop[]>(() => normalizeStops(initialStops));
  const [baseline, setBaseline] = useState(() => JSON.stringify(normalizeStops(initialStops)));
  const [winerySearch, updateWinerySearch] = useState("");
  const [geocodeQuery, updateGeocodeQuery] = useState("");
  const [geocodingStopIndex, updateGeocodingStopIndex] = useState<number | null>(null);
  const [manualStop, setManualStop] = useState<ManualStopDraft>(emptyManualStop);
  const [manualErrors, setManualErrors] = useState<ManualStopError[] | null>(null);

  // Opening the sheet, or switching route, starts the stops afresh.
  const openKey = `${visible}:${routeKey}`;
  const [shownFor, setShownFor] = useState(openKey);
  if (shownFor !== openKey) {
    const next = normalizeStops(initialStops);
    setShownFor(openKey);
    updateStops(next);
    setBaseline(JSON.stringify(next));
    updateWinerySearch("");
    updateGeocodeQuery("");
    updateGeocodingStopIndex(null);
    setManualStop(emptyManualStop());
    setManualErrors(null);
  }
  useEffect(() => {
    revision.current += 1;
  }, [openKey]);

  const debouncedSearch = useDebounce(winerySearch, 300).trim();
  const search = useAdminWinerySearch(debouncedSearch, 0, 20);
  const searchReady = winerySearch.trim().length >= STOP_WINERY_MIN_QUERY;
  const wineryResults: AdminWinery[] = searchReady ? (search.currentData?.items ?? []) : [];
  const wineryLoading = searchReady && (winerySearch.trim() !== debouncedSearch || search.isFetching);

  const autoGeocodeWineryStop = async (winery: AdminWinery, expectedStop: AdminRouteStop) => {
    const request = revision.current;
    const query = [winery.name, winery.regionName, winery.countryName].filter(Boolean).join(", ");
    const result = await geocodeAddress(query);
    if (request !== revision.current) return;
    if (!result.ok || !result.location) {
      showToast(t("admin.routes.wineryGeocodeError", { name: winery.name }), "warning");
      return;
    }
    const location = result.location;
    updateStops((current) =>
      current.map((stop) =>
        stop === expectedStop
          ? { ...stop, latitude: location.latitude, longitude: location.longitude, address: stop.address || location.formattedAddress }
          : stop,
      ),
    );
  };

  const selectWineryAsStop = (winery: AdminWinery) => {
    const stop: AdminRouteStop = {
      name: winery.name,
      description: t("admin.routes.wineryStopDescription", { place: winery.regionName || winery.countryName || "" }),
      type: "winery",
      address: winery.address || "",
      latitude: winery.latitude ?? null,
      longitude: winery.longitude ?? null,
      stopOrder: stops.length + 1,
      estimatedDuration: WINERY_STOP_MINUTES,
    };
    updateStops([...stops, stop]);
    updateWinerySearch("");
    if (stop.latitude == null || stop.longitude == null) void autoGeocodeWineryStop(winery, stop);
  };

  const geocodeStop = async (index: number) => {
    const request = revision.current;
    const expectedStop = stops[index];
    const query = geocodeQuery.trim() || expectedStop?.address || expectedStop?.name;
    if (!query) {
      showToast(t("admin.routes.geocodeRequired"), "warning");
      return;
    }
    updateGeocodingStopIndex(index);
    const result = await geocodeAddress(query);
    if (request !== revision.current) return;
    if (!result.ok || !result.location) {
      updateGeocodingStopIndex(null);
      const missingKey = result.status === "NO_API_KEY";
      showToast(t(missingKey ? "admin.routes.geoMissingKey" : "admin.routes.geoNotFound"), missingKey ? "error" : "warning");
      return;
    }
    const location = result.location;
    updateStops((current) =>
      current.map((stop) =>
        stop === expectedStop
          ? { ...stop, latitude: location.latitude, longitude: location.longitude, address: location.formattedAddress }
          : stop,
      ),
    );
    updateGeocodeQuery("");
    updateGeocodingStopIndex(null);
    showSuccess(t("admin.routes.locationUpdated"));
  };

  const updateManualStop = (updater: (current: ManualStopDraft) => ManualStopDraft) => {
    const next = updater(manualStop);
    setManualStop(next);
    // Errors shown after a failed add follow the fields as they are fixed.
    if (manualErrors) setManualErrors(validateManualStop(next));
  };

  const addManualStop = () => {
    const errors = validateManualStop(manualStop);
    if (errors.length > 0) {
      setManualErrors(errors);
      return;
    }
    updateStops((current) => reorderStops([...current, toManualRouteStop(manualStop, current.length + 1)]));
    setManualStop(emptyManualStop());
    setManualErrors(null);
  };

  return {
    stops,
    dirty: JSON.stringify(stops) !== baseline,
    winerySearch,
    updateWinerySearch,
    wineryResults,
    wineryLoading,
    selectWineryAsStop,
    geocodeQuery,
    updateGeocodeQuery,
    geocodingStopIndex,
    updateGeocodingStopIndex,
    geocodeStop,
    isGeocoding,
    selectStopLocation: (index: number, latitude: number, longitude: number) => {
      revision.current += 1;
      updateStops((current) => current.map((stop, position) => (position === index ? { ...stop, latitude, longitude } : stop)));
    },
    removeStop: (index: number) => updateStops((current) => reorderStops(current.filter((_, position) => position !== index))),
    moveStop: (index: number, direction: "up" | "down") => {
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= stops.length) return;
      const next = [...stops];
      [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
      updateStops(reorderStops(next));
    },
    manualStop,
    manualErrors: manualErrors ?? [],
    updateManualStop,
    addManualStop,
  };
}
