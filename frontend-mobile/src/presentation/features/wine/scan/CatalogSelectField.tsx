import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  filterCatalogOptions,
  type CatalogChoice,
  type CatalogOption,
  findCatalogMatch,
} from "@/domain/wine/catalogChoice";
import { TextField } from "@/presentation/components/ui/TextField";
import { lightTokens, radii, spacing, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface CatalogSelectFieldProps {
  label: string;
  value: CatalogChoice;
  options: readonly CatalogOption[];
  onChange: (choice: CatalogChoice) => void;
  /** Options already match the typed text (remote search), so they are not filtered again. */
  remoteOptions?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
}

/**
 * Searchable catalog picker. Typing searches the catalog; "Not in the list" keeps the typed text as a proposed
 * new value, which an admin reviews.
 */
export function CatalogSelectField({
  label,
  value,
  options,
  onChange,
  remoteOptions = false,
  required,
  error,
  hint,
}: CatalogSelectFieldProps) {
  const { t } = useTranslation();
  const [searching, setSearching] = useState(false);
  const typed = value.name.trim();
  const suggestions = remoteOptions ? options.slice(0, 8) : filterCatalogOptions(options, typed);
  const exact = findCatalogMatch(options, typed);
  const showSuggestions = searching && !value.id && typed.length > 0;

  const pick = (option: CatalogOption) => {
    onChange({ id: option.id, name: option.name });
    setSearching(false);
  };

  return (
    <View style={styles.container}>
      <TextField
        label={label}
        required={required}
        value={value.name}
        hint={hint}
        error={error}
        onChangeText={(name) => {
          onChange({ id: null, name });
          setSearching(true);
        }}
        onFocus={() => setSearching(true)}
        // The form's scroll view keeps taps on suggestions from blurring the input first.
        onBlur={() => setSearching(false)}
      />
      {typed.length > 0 && !showSuggestions ? (
        <Text
          style={[styles.status, value.id ? styles.statusCatalog : styles.statusProposal]}
          accessibilityLiveRegion="polite"
        >
          {value.id ? t("scan.submissionForm.catalog.fromCatalog") : t("scan.submissionForm.catalog.newValue")}
        </Text>
      ) : null}
      {showSuggestions ? (
        <View style={styles.list} accessibilityRole="list">
          {suggestions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => pick(option)}
              style={styles.option}
              accessibilityRole="button"
              accessibilityLabel={t("scan.submissionForm.catalog.select", { name: option.name })}
            >
              <Text style={styles.optionText}>{option.name}</Text>
            </Pressable>
          ))}
          {suggestions.length === 0 ? (
            <Text style={styles.empty}>{t("scan.submissionForm.catalog.noResults")}</Text>
          ) : null}
          {!exact ? (
            <Pressable
              onPress={() => setSearching(false)}
              style={styles.option}
              accessibilityRole="button"
              accessibilityHint={t("scan.submissionForm.catalog.newValue")}
            >
              <Text style={styles.manualText}>
                {t("scan.submissionForm.catalog.notInList", { value: typed })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[1] },
  status: { ...textStyles.caption },
  statusCatalog: { color: lightTokens.textTertiary },
  statusProposal: { color: wine[700] },
  list: {
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.lg,
    backgroundColor: lightTokens.surfaceDefault,
    overflow: "hidden",
  },
  option: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTokens.borderDefault,
  },
  optionText: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  manualText: { ...textStyles.labelMedium, color: wine[700] },
  empty: { ...textStyles.bodySmall, color: lightTokens.textTertiary, padding: spacing[3] },
});
