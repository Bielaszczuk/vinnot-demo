/**
 * The catalog wine a submission merges into: searched by name as you type, never a raw id.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminWine } from "@/domain/admin/admin.types";
import { EntityPicker, type PickerOption } from "@/presentation/components/forms";
import { useAdminWineSearch } from "@/presentation/hooks/queries/admin";
import { useDebounce } from "@/presentation/hooks/ui";

const MIN_QUERY = 2;

function toOption(wine: AdminWine): PickerOption {
  return {
    id: wine.id,
    label: wine.name,
    description: [wine.wineryName, wine.vintage].filter(Boolean).join(" · ") || null,
  };
}

export interface SubmissionWinePickerProps {
  value: { id: string; name: string } | null;
  onChange: (wine: { id: string; name: string } | null) => void;
  error?: string;
  disabled?: boolean;
}

export function SubmissionWinePicker({ value, onChange, error, disabled }: SubmissionWinePickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const search = useAdminWineSearch(debounced);
  const long = query.trim().length >= MIN_QUERY;
  const options = long ? (search.currentData?.items ?? []).map(toOption) : [];
  return (
    <EntityPicker
      label={t("admin.submissions.targetWine")}
      required
      placeholder={t("admin.submissions.targetWinePlaceholder")}
      searchPlaceholder={t("admin.submissions.targetWineSearch")}
      options={options}
      loading={long && (query !== debounced || search.isFetching)}
      onQueryChange={setQuery}
      minQueryLength={MIN_QUERY}
      emptyLabel={t("admin.submissions.targetWineEmpty")}
      value={value ? { id: value.id, label: value.name } : null}
      onChange={(option) => onChange(option ? { id: option.id, name: option.label } : null)}
      hint={t("admin.submissions.targetWineHint")}
      error={error}
      disabled={disabled}
      testID="submission-target-wine"
    />
  );
}
