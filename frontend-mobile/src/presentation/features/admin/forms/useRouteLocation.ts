/**
 * Country and region of the route sheet. The route stores both by name, so the picker
 * options carry the catalog country id (to load its regions) and the region name.
 */
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { AdminRouteDraft } from "@/domain/admin/adminRouteDraft";
import type { PickerOption } from "@/presentation/components/forms";
import { useAdminCountries, useAdminRegions } from "@/presentation/hooks/queries/admin";
import { useCountryName } from "@/presentation/hooks/useCountryName";

/** Picker row that removes the optional region. */
const NO_REGION = "";

export function useRouteLocation(form: UseFormReturn<AdminRouteDraft>) {
  const { t } = useTranslation();
  const { control, setValue, formState } = form;
  const [country, region] = useWatch({ control, name: ["country", "region"] });
  const countryName = useCountryName();
  const countries = useAdminCountries().data ?? [];
  // Labels follow the UI language; the route keeps the stored catalog name.
  const countryOptions: PickerOption[] = countries.map((item) => ({ id: item.id, label: countryName(item.name) }));
  // Older routes may hold the country id instead of its name.
  const storedCountry = countries.find((item) => item.name === country || item.id === country);
  const countryMatch = storedCountry && countryOptions.find((option) => option.id === storedCountry.id);
  const regionsQuery = useAdminRegions(countryMatch?.id);
  const regionList: PickerOption[] = countryMatch
    ? (regionsQuery.data ?? []).map((item) => ({ id: item.name, label: item.name }))
    : [];

  const selectCountry = (option: PickerOption | null) => {
    const name = option ? (countries.find((item) => item.id === option.id)?.name ?? option.label) : "";
    if (name === country) return;
    setValue("country", name, { shouldDirty: true, shouldValidate: formState.isSubmitted });
    setValue("region", "", { shouldDirty: true });
    setValue("subregion", "", { shouldDirty: true });
  };
  const selectRegion = (option: PickerOption | null) =>
    setValue("region", option?.id ?? NO_REGION, { shouldDirty: true });

  return {
    countryOptions,
    country: countryMatch ?? (country ? { id: country, label: countryName(country) } : null),
    regionOptions: region ? [{ id: NO_REGION, label: t("admin.routes.noRegion") }, ...regionList] : regionList,
    region: region ? { id: region, label: region } : null,
    regionsLoading: !!countryMatch && regionsQuery.isFetching,
    hasCountry: !!countryMatch,
    selectCountry,
    selectRegion,
  };
}
