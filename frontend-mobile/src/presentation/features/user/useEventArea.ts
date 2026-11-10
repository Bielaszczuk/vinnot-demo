import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  notificationsService,
  type MapPoint,
  type PlaceSearchFailure,
} from "@/application/services/notifications.service";
import type { LocationFailure } from "@/application/services/location.service";
import type { Region } from "@/application/services/regions.service";
import { isRegionQuery, matchRegions, type EventArea } from "@/domain/notification/eventArea";
import { useRegions } from "@/presentation/hooks/queries/wine/useRegions";
import { useToast } from "@/presentation/providers/ToastProvider";

export type EventAreaAction = "location" | "region" | "place" | "point" | "clear";

interface AreaRead {
  request: number;
  area: EventArea | null;
  failed: boolean;
}

function byCountryAndName(a: Region, b: Region): number {
  return a.countryName.localeCompare(b.countryName) || a.name.localeCompare(b.name);
}

/**
 * The "events near you" area: read when the sheet opens, changed with one tap (approximate location or a catalogue
 * region found by searching) or with a pin on the map, and cleared with "stop". The map appears when the catalogue
 * has no match, or on demand: searching moves the pin, a tap or drag adjusts it and only "use this point" saves.
 * A denied location is not an error: it opens the search instead.
 */
export function useEventArea(visible: boolean) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [request, setRequest] = useState(0);
  const [read, setRead] = useState<AreaRead | null>(null);
  const [busy, setBusy] = useState<EventAreaAction | null>(null);
  const [notice, setNotice] = useState<LocationFailure | null>(null);
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [query, setQueryValue] = useState("");
  const [placeFailure, setPlaceFailure] = useState<PlaceSearchFailure | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [pin, setPin] = useState<MapPoint | null>(null);
  const [openedFor, setOpenedFor] = useState(false);
  const regionsQuery = useRegions(undefined, visible && regionsOpen);

  // Each opening starts over: a fresh read, no notice and the search closed and empty.
  if (visible !== openedFor) {
    setOpenedFor(visible);
    if (visible) {
      setRequest((value) => value + 1);
      setNotice(null);
      setRegionsOpen(false);
      setQueryValue("");
      setPlaceFailure(null);
      setMapOpen(false);
      setPin(null);
    }
  }

  useEffect(() => {
    if (!visible || request === 0) return undefined;
    let active = true;
    notificationsService
      .getEventArea()
      .then(
        (area): AreaRead => ({ request, area, failed: false }),
        (): AreaRead => ({ request, area: null, failed: true }),
      )
      .then((next) => {
        if (active) setRead(next);
      });
    return () => {
      active = false;
    };
  }, [visible, request]);

  const current = read?.request === request ? read : null;
  const area = current?.area ?? null;
  const keep = (next: EventArea | null) => setRead({ request, area: next, failed: false });

  const regions = useMemo(() => [...regionsQuery.data].sort(byCountryAndName), [regionsQuery.data]);
  const matches = useMemo(() => matchRegions(regions, query), [regions, query]);
  const catalogueReady = regionsOpen && !regionsQuery.isLoading && !regionsQuery.isError;
  const mapShown = catalogueReady && (mapOpen || (isRegionQuery(query) && matches.length === 0));
  const canSearchPlace = mapShown && isRegionQuery(query);

  const closeSearch = () => {
    setRegionsOpen(false);
    setQueryValue("");
    setPlaceFailure(null);
    setMapOpen(false);
    setPin(null);
  };

  const setQuery = (value: string) => {
    setQueryValue(value);
    setPlaceFailure(null);
  };

  const run = (action: EventAreaAction, task: () => Promise<void>) => {
    if (busy) return;
    setBusy(action);
    task()
      .catch(() => showError(t("notificationPreferences.area.saveError")))
      .finally(() => setBusy(null));
  };

  const chooseApproximateLocation = () =>
    run("location", async () => {
      setNotice(null);
      const result = await notificationsService.setApproximateEventArea();
      if (result.ok) {
        keep(result.area);
        closeSearch();
        return;
      }
      setNotice(result.reason);
      setRegionsOpen(true);
    });

  const chooseRegion = (region: Region) =>
    run("region", async () => {
      keep(await notificationsService.setEventAreaRegion(region));
      setNotice(null);
      closeSearch();
    });

  const searchPlace = () => {
    if (!canSearchPlace) return;
    run("place", async () => {
      const result = await notificationsService.findPlace(query);
      if (!result.ok) {
        setPlaceFailure(result.reason);
        return;
      }
      setPin(result.place);
    });
  };

  const movePin = (latitude: number, longitude: number) => setPin({ latitude, longitude });

  const savePin = () => {
    if (!pin) return;
    run("point", async () => {
      keep(await notificationsService.setEventAreaPoint(pin));
      setNotice(null);
      closeSearch();
    });
  };

  const stop = () =>
    run("clear", async () => {
      await notificationsService.clearEventArea();
      keep(null);
      closeSearch();
    });

  return {
    t,
    area,
    isLoading: visible && current === null,
    loadFailed: current?.failed ?? false,
    retry: () => setRequest((value) => value + 1),
    busy,
    notice,
    regionsOpen,
    query,
    setQuery,
    matches,
    mapShown,
    openMap: () => setMapOpen(true),
    pin,
    movePin,
    savePin,
    canSearchPlace,
    placeFailure,
    regionsLoading: regionsQuery.isLoading,
    regionsFailed: regionsQuery.isError,
    retryRegions: () => void regionsQuery.refetch(),
    chooseApproximateLocation,
    toggleRegions: () => (regionsOpen ? closeSearch() : setRegionsOpen(true)),
    chooseRegion,
    searchPlace,
    stop,
  };
}
