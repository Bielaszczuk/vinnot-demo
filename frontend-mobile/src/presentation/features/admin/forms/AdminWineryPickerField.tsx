/**
 * Winery field of catalog forms: searches the catalog as you type and, when the winery is
 * missing, offers "+ Create winery «X»", which opens the inline creator and selects the
 * new winery once it is saved.
 */
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { AdminWinery } from "@/domain/admin/admin.types";
import { EntityPicker, type PickerOption } from "@/presentation/components/forms";
import { useAdminWinerySearch } from "@/presentation/hooks/queries/admin";
import { useDebounce } from "@/presentation/hooks/ui";
import { useCountryName } from "@/presentation/hooks/useCountryName";
import { spacing } from "@/shared/theme/tokens";
import { InlineWineryCreator } from "./InlineWineryCreator";

const MIN_QUERY = 2;

export interface SelectedWinery {
  id: string;
  name: string;
}

export interface AdminWineryPickerFieldProps {
  value: SelectedWinery | null;
  onChange: (winery: SelectedWinery | null) => void;
  error?: string;
  disabled?: boolean;
}

function toOption(winery: AdminWinery, countryName: (name: string | null | undefined) => string): PickerOption {
  return {
    id: winery.id,
    label: winery.name,
    description: [winery.regionName, countryName(winery.countryName)].filter(Boolean).join(", ") || null,
  };
}

export function AdminWineryPickerField({ value, onChange, error, disabled = false }: AdminWineryPickerFieldProps) {
  const { t } = useTranslation();
  const countryName = useCountryName();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const debounced = useDebounce(query, 300);
  const search = useAdminWinerySearch(debounced, 0, 10);
  const searching = query.trim().length >= MIN_QUERY && (query !== debounced || search.isFetching);
  const options = query.trim().length >= MIN_QUERY ? (search.currentData?.items ?? []).map((winery) => toOption(winery, countryName)) : [];

  return (
    <View style={styles.container}>
      <EntityPicker
        label={t("admin.wines.winery")}
        required
        placeholder={t("admin.wines.wineryPlaceholder")}
        searchPlaceholder={t("admin.wines.winerySearchPlaceholder")}
        options={options}
        loading={searching}
        onQueryChange={setQuery}
        minQueryLength={MIN_QUERY}
        emptyLabel={t("admin.wines.noWineryMatches")}
        createLabel={(name) => t("admin.wines.createWineryNamed", { name })}
        onCreate={setCreating}
        value={value ? { id: value.id, label: value.name } : null}
        onChange={(option) => onChange(option ? { id: option.id, name: option.label } : null)}
        error={creating == null ? error : undefined}
        disabled={disabled || creating != null}
        testID="winery-picker"
      />
      {creating != null && (
        <InlineWineryCreator
          initialName={creating}
          onCancel={() => setCreating(null)}
          onCreated={(winery) => {
            setCreating(null);
            onChange({ id: winery.id, name: winery.name });
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ container: { gap: spacing[3] } });
