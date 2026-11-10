/**
 * Corrections a moderator applies before publishing a submission. Each field starts blank and
 * shows the submitted value as its placeholder: a blank field keeps what was submitted.
 */
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Controller, useWatch, type Control, type UseFormSetValue } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { AdminWineSubmission } from "@/domain/admin/admin.types";
import { ADMIN_WINE_TYPES } from "@/domain/admin/adminWineDraft";
import {
  SUBMISSION_OVERRIDE_LIMITS,
  type SubmissionDecisionDraft,
} from "@/domain/admin/adminSubmissionCatalog";
import { ChoiceChips, EntityPicker, FormTextField } from "@/presentation/components/forms";
import { AdminGrapesPickerField } from "@/presentation/features/admin/forms/AdminGrapesPickerField";
import {
  useAdminCountries,
  useAdminRegions,
  useAdminWinerySearch,
} from "@/presentation/hooks/queries/admin";
import { useDebounce } from "@/presentation/hooks/ui";
import { wineTypeLabel } from "@/presentation/features/wine/wineTypeLabel";
import { spacing } from "@/shared/theme/tokens";

const MIN_QUERY = 2;
const asOption = (ref: { id: string | null; name: string }) => ({ id: ref.id ?? `name:${ref.name}`, label: ref.name });

export interface SubmissionOverridesProps {
  control: Control<SubmissionDecisionDraft>;
  setValue: UseFormSetValue<SubmissionDecisionDraft>;
  submission: AdminWineSubmission;
  disabled: boolean;
}

export function SubmissionOverrides({ control, setValue, submission, disabled }: SubmissionOverridesProps) {
  const { t } = useTranslation();
  const keep = t("admin.submissions.keepSubmitted");
  const country = useWatch({ control, name: "country" });
  const countries = useAdminCountries();
  const regions = useAdminRegions(country?.id ?? submission.countryId ?? undefined);
  const [wineryQuery, setWineryQuery] = useState("");
  const debouncedWinery = useDebounce(wineryQuery, 300);
  const winerySearch = useAdminWinerySearch(debouncedWinery);
  const wineryOptions = wineryQuery.trim().length >= MIN_QUERY
    ? (winerySearch.currentData?.items ?? []).map((winery) => ({ id: winery.id, label: winery.name }))
    : [];
  const valueLabel = (name: string) => t("admin.submissions.useValue", { name });

  return (
    <View style={styles.container}>
      <FormTextField
        control={control}
        name="wineName"
        label={t("admin.submissions.fields.wineName")}
        placeholder={submission.wineName || keep}
        maxLength={SUBMISSION_OVERRIDE_LIMITS.wineName}
        editable={!disabled}
      />
      <Controller
        control={control}
        name="wineryName"
        render={({ field }) => (
          <EntityPicker
            label={t("admin.submissions.fields.wineryName")}
            placeholder={submission.wineryName || keep}
            searchPlaceholder={t("admin.submissions.winerySearch")}
            options={wineryOptions}
            loading={wineryQuery.trim().length >= MIN_QUERY && (wineryQuery !== debouncedWinery || winerySearch.isFetching)}
            onQueryChange={setWineryQuery}
            minQueryLength={MIN_QUERY}
            createLabel={valueLabel}
            onCreate={(name) => field.onChange(name.slice(0, SUBMISSION_OVERRIDE_LIMITS.wineryName))}
            value={field.value ? { id: `name:${field.value}`, label: field.value } : null}
            onChange={(option) => field.onChange(option?.label ?? "")}
            disabled={disabled}
          />
        )}
      />
      <Controller
        control={control}
        name="wineType"
        render={({ field }) => (
          <ChoiceChips
            label={t("admin.submissions.fields.wineType")}
            hint={t("admin.submissions.wineTypeHint")}
            options={ADMIN_WINE_TYPES.map((type) => ({ value: type, label: wineTypeLabel(t, type) }))}
            value={field.value}
            onChange={(type) => field.onChange(type === field.value ? null : type)}
            disabled={disabled}
          />
        )}
      />
      <View style={styles.row}>
        <View style={styles.cell}>
          <FormTextField
            control={control}
            name="vintage"
            label={t("admin.submissions.fields.vintage")}
            placeholder={submission.vintage ? String(submission.vintage) : keep}
            keyboardType="number-pad"
            maxLength={4}
            editable={!disabled}
          />
        </View>
        <View style={styles.cell}>
          <FormTextField
            control={control}
            name="alcoholContent"
            label={t("admin.submissions.fields.alcoholContent")}
            placeholder={submission.alcoholContent != null ? String(submission.alcoholContent) : keep}
            keyboardType="decimal-pad"
            maxLength={5}
            editable={!disabled}
          />
        </View>
      </View>
      <Controller
        control={control}
        name="grapes"
        render={({ field }) => (
          <AdminGrapesPickerField value={field.value} onChange={field.onChange} disabled={disabled} />
        )}
      />
      <Controller
        control={control}
        name="country"
        render={({ field }) => (
          <EntityPicker
            label={t("admin.submissions.fields.country")}
            placeholder={submission.country || keep}
            options={countries.data.map((item) => ({ id: item.id, label: item.name }))}
            loading={countries.isLoading}
            value={field.value ? asOption(field.value) : null}
            onChange={(option) => {
              field.onChange(option ? { id: option.id, name: option.label } : null);
              setValue("region", null);
            }}
            disabled={disabled}
          />
        )}
      />
      <Controller
        control={control}
        name="region"
        render={({ field }) => (
          <EntityPicker
            label={t("admin.submissions.fields.region")}
            placeholder={submission.region || keep}
            options={regions.data.map((item) => ({ id: item.id, label: item.name }))}
            loading={regions.isFetching}
            createLabel={valueLabel}
            onCreate={(name) => field.onChange({ id: null, name: name.slice(0, SUBMISSION_OVERRIDE_LIMITS.region) })}
            value={field.value ? asOption(field.value) : null}
            onChange={(option) => field.onChange(option ? { id: option.id, name: option.label } : null)}
            disabled={disabled}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[4] },
  row: { flexDirection: "row", gap: spacing[3] },
  cell: { flex: 1 },
});
