/**
 * Grapes of a catalog wine: searchable multi-select over the grape catalog (GET /grape-types)
 * with "Other: «X»" for a variety the catalog does not list yet.
 */
import { useTranslation } from "react-i18next";
import { ADMIN_WINE_LIMITS } from "@/domain/admin/adminWineDraft";
import { EntityPicker } from "@/presentation/components/forms";
import { useGrapeTypes } from "@/presentation/hooks/queries/wine/useGrapeTypes";

export interface AdminGrapesPickerFieldProps {
  value: readonly string[];
  onChange: (grapes: string[]) => void;
  error?: string;
  disabled?: boolean;
}

const asOption = (name: string) => ({ id: name, label: name });

export function AdminGrapesPickerField({ value, onChange, error, disabled }: AdminGrapesPickerFieldProps) {
  const { t } = useTranslation();
  const grapeTypes = useGrapeTypes();
  const options = grapeTypes.data.map((grape) => asOption(grape.name));
  const full = value.length >= ADMIN_WINE_LIMITS.grapes;
  return (
    <EntityPicker
      multiple
      label={t("admin.wines.grapes")}
      placeholder={t(value.length ? "admin.wines.grapesAddMore" : "admin.wines.grapesPlaceholder")}
      searchPlaceholder={t("admin.wines.grapesSearch")}
      options={options}
      loading={grapeTypes.isLoading}
      value={value.map(asOption)}
      onChange={(selected) => onChange(selected.map((option) => option.label))}
      createLabel={(name) => t("admin.wines.otherGrape", { name })}
      onCreate={
        full ? undefined : (name) => onChange([...value, name.slice(0, ADMIN_WINE_LIMITS.grapeName)])
      }
      hint={t("admin.wines.grapesHint")}
      error={error}
      disabled={disabled}
      testID="grapes-picker"
    />
  );
}
