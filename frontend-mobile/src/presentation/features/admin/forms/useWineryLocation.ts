/**
 * Location of the winery sheet: country and region choices, the geocoder search and the map
 * pin. A newer search, pin move or reopened sheet makes a late geocoder answer stale.
 */
import { useEffect, useRef, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { draftCoordinates, type AdminWineryDraft } from "@/domain/admin/adminWineryDraft";
import type { PickerOption } from "@/presentation/components/forms";
import { useAdminCountries, useAdminRegions } from "@/presentation/hooks/queries/admin";
import { useGeocoding } from "@/presentation/hooks/useGeocoding";
import { useCountryName } from "@/presentation/hooks/useCountryName";
import { useToast } from "@/presentation/providers/ToastProvider";

/** Picker row that removes the optional region. */
export const NO_REGION_ID = "";

export function useWineryLocation(form: UseFormReturn<AdminWineryDraft>, visible: boolean) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const { geocodeAddress, isGeocoding } = useGeocoding();
  const displayCountry = useCountryName();
  const [searchAddress, updateSearchAddress] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const revision = useRef(0);
  const { control, setValue, getValues, formState } = form;
  const [countryId, countryName, regionId, regionName, latitude, longitude] = useWatch({
    control,
    name: ["countryId", "countryName", "regionId", "regionName", "latitude", "longitude"],
  });
  const countries = useAdminCountries().data;
  const regionsQuery = useAdminRegions(countryId || undefined);

  // Opening or closing the sheet starts the location search afresh.
  const [shownFor, setShownFor] = useState(visible);
  if (shownFor !== visible) {
    setShownFor(visible);
    updateSearchAddress("");
    setAdvancedOpen(false);
  }
  useEffect(() => {
    revision.current += 1;
  }, [visible]);

  const touch = { shouldDirty: true, shouldValidate: formState.isSubmitted };
  const setCoordinates = (nextLatitude: number, nextLongitude: number) => {
    setValue("latitude", String(nextLatitude), touch);
    setValue("longitude", String(nextLongitude), touch);
  };

  const selectCountry = (option: PickerOption | null) => {
    if ((option?.id ?? "") === countryId) return;
    setValue("countryId", option?.id ?? "", touch);
    const stored = countries.find((country) => country.id === option?.id)?.name;
    setValue("countryName", stored ?? option?.label ?? "", { shouldDirty: true });
    setValue("regionId", "", { shouldDirty: true });
    setValue("regionName", "", { shouldDirty: true });
  };
  const selectRegion = (option: PickerOption | null) => {
    const id = option?.id ?? NO_REGION_ID;
    setValue("regionId", id, { shouldDirty: true });
    setValue("regionName", id ? (option?.label ?? "") : "", { shouldDirty: true });
  };

  const runGeocode = async () => {
    const query = searchAddress.trim();
    if (!query) {
      showError(t("admin.wineries.geocodeRequired"));
      return;
    }
    const request = ++revision.current;
    const result = await geocodeAddress(query);
    if (request !== revision.current) return;
    if (!result.ok || !result.location) {
      showError(t("admin.wineries.geoNotFound"));
      return;
    }
    setCoordinates(result.location.latitude, result.location.longitude);
    if (!getValues("address").trim()) setValue("address", result.location.formattedAddress ?? "", touch);
    updateSearchAddress("");
  };

  const countryOptions: PickerOption[] = countries.map((country) => ({ id: country.id, label: displayCountry(country.name) }));
  const regionList: PickerOption[] = countryId
    ? regionsQuery.data.map((region) => ({ id: region.id, label: region.name }))
    : [];
  const errors = formState.errors;
  return {
    countryOptions,
    country: countryId ? (countryOptions.find((option) => option.id === countryId) ?? { id: countryId, label: displayCountry(countryName) }) : null,
    regionOptions: regionId
      ? [{ id: NO_REGION_ID, label: t("admin.wineries.noRegion") }, ...regionList]
      : regionList,
    region: regionId ? (regionList.find((option) => option.id === regionId) ?? { id: regionId, label: regionName }) : null,
    regionsLoading: !!countryId && regionsQuery.isFetching,
    hasCountry: !!countryId,
    selectCountry,
    selectRegion,
    searchAddress,
    setSearchAddress: (value: string) => {
      revision.current += 1;
      updateSearchAddress(value);
    },
    runGeocode,
    isGeocoding,
    point: draftCoordinates({ latitude, longitude }),
    moveMarker: (nextLatitude: number, nextLongitude: number) => {
      revision.current += 1;
      setCoordinates(nextLatitude, nextLongitude);
    },
    // An invalid coordinate keeps the advanced fields open so its error stays visible.
    advancedOpen: advancedOpen || !!errors.latitude || !!errors.longitude,
    toggleAdvanced: () => setAdvancedOpen((current) => !(current || !!errors.latitude || !!errors.longitude)),
  };
}
