/**
 * AdminFilterPicker — a searchable list filter (country, region…) built on EntityPicker.
 * Its first row, "all", clears the filter.
 */
import { StyleSheet, View } from "react-native";
import { EntityPicker, type PickerOption } from "@/presentation/components/forms";

const ALL_ID = "";

export interface AdminFilterPickerProps {
  label: string;
  value: string | null;
  options: readonly { id: string; name: string }[];
  /** Label of the row that clears the filter; also shown while nothing is chosen. */
  allLabel: string;
  searchPlaceholder: string;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}

export function AdminFilterPicker({
  label,
  value,
  options,
  allLabel,
  searchPlaceholder,
  onSelect,
  disabled,
}: AdminFilterPickerProps) {
  const choices: PickerOption[] = [
    { id: ALL_ID, label: allLabel },
    ...options.map((option) => ({ id: option.id, label: option.name })),
  ];
  return (
    <View style={styles.filter}>
      <EntityPicker
        label={label}
        placeholder={allLabel}
        searchPlaceholder={searchPlaceholder}
        options={choices}
        value={value ? (choices.find((option) => option.id === value) ?? null) : null}
        onChange={(option) => onSelect(option?.id || null)}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({ filter: { flex: 1 } });
