/**
 * Creates a missing winery from inside another catalog form (POST /admin/wineries) and hands
 * the result back so that form selects it.
 */
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { AdminCountry, AdminWinery } from "@/domain/admin/admin.types";
import { adminFormErrorKey } from "@/domain/admin/adminFormError";
import { toQuickWineryPayload, validateQuickWinery, type QuickWineryDraft } from "@/domain/admin/quickWinery";
import { domainResolver, useGuardedSubmit } from "@/presentation/hooks/forms";
import { useAdminCountries, useAdminRegions, useAdminWineryMutations } from "@/presentation/hooks/queries/admin";
import { useToast } from "@/presentation/providers/ToastProvider";
import { getMutationErrorCode } from "@/presentation/store/mutationAdapter";

/** Most of the catalog is Argentine; the country stays visible and can be changed. */
const DEFAULT_COUNTRY_CODE = "AR";

function defaultCountryId(countries: readonly AdminCountry[]): string {
  return countries.find((country) => country.code?.toUpperCase() === DEFAULT_COUNTRY_CODE)?.id ?? "";
}

export function useInlineWineryCreator(initialName: string, onCreated: (winery: AdminWinery) => void) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { create } = useAdminWineryMutations();
  const countries = useAdminCountries().data;
  const form = useForm<QuickWineryDraft>({
    defaultValues: { name: initialName, countryId: defaultCountryId(countries), regionId: "" },
    shouldFocusError: false,
    resolver: domainResolver(validateQuickWinery, (code) => t(`admin.wines.inlineWinery.validation.${code}`)),
  });
  const countryId = useWatch({ control: form.control, name: "countryId" });
  const regionsQuery = useAdminRegions(countryId || undefined);
  const { guard, pending } = useGuardedSubmit();

  // Countries may arrive after the creator opened.
  const fallbackCountryId = defaultCountryId(countries);
  useEffect(() => {
    if (fallbackCountryId && !form.getValues("countryId")) form.setValue("countryId", fallbackCountryId);
  }, [fallbackCountryId, form]);

  const selectCountry = (id: string) => {
    form.setValue("countryId", id, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
    form.setValue("regionId", "", { shouldDirty: true });
  };

  const submit = form.handleSubmit((values) =>
    guard(async () => {
      try {
        const winery = (await create.mutateAsync(toQuickWineryPayload(values))) as AdminWinery;
        showSuccess(t("admin.wines.inlineWinery.created", { name: winery.name }));
        onCreated(winery);
      } catch (error) {
        showError(t(adminFormErrorKey(getMutationErrorCode(error), "admin.wineries.saveError")));
      }
    }),
  );

  return {
    form,
    countryId,
    countries,
    regions: countryId ? regionsQuery.data : [],
    regionsLoading: !!countryId && regionsQuery.isFetching,
    selectCountry,
    submit,
    saving: pending || create.isPending,
  };
}
