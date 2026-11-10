import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  filterCatalogOptions,
  findCatalogMatch,
  isKnownGrape,
  normalizeCatalogName,
  type CatalogOption,
} from "@/domain/wine/catalogChoice";
import { TextField } from "@/presentation/components/ui/TextField";
import { lightTokens, radii, spacing, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export const MAX_SUBMITTED_GRAPES = 10;

interface GrapesSelectFieldProps {
  label: string;
  value: readonly string[];
  options: readonly CatalogOption[];
  onChange: (grapes: string[]) => void;
  error?: string;
}

/** Multi-select of catalog grape varieties; a grape that is not in the list is added as a proposal. */
export function GrapesSelectField({ label, value, options, onChange, error }: GrapesSelectFieldProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const typed = query.trim();
  const selected = new Set(value.map(normalizeCatalogName));
  const suggestions = typed
    ? filterCatalogOptions(options.filter((option) => !selected.has(normalizeCatalogName(option.name))), typed)
    : [];
  const full = value.length >= MAX_SUBMITTED_GRAPES;
  const canPropose = typed.length > 0 && !findCatalogMatch(options, typed) && !selected.has(normalizeCatalogName(typed));

  const add = (name: string) => {
    if (!full) onChange([...value, name]);
    setQuery("");
  };

  return (
    <View style={styles.container}>
      <TextField
        label={label}
        value={query}
        onChangeText={setQuery}
        editable={!full}
        error={error}
        hint={full ? t("scan.submissionForm.catalog.grapesLimit", { count: MAX_SUBMITTED_GRAPES }) : undefined}
      />
      {suggestions.length > 0 || canPropose ? (
        <View style={styles.list} accessibilityRole="list">
          {suggestions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => add(option.name)}
              style={styles.option}
              accessibilityRole="button"
              accessibilityLabel={t("scan.submissionForm.catalog.select", { name: option.name })}
            >
              <Text style={styles.optionText}>{option.name}</Text>
            </Pressable>
          ))}
          {canPropose ? (
            <Pressable
              onPress={() => add(typed)}
              style={styles.option}
              accessibilityRole="button"
              accessibilityHint={t("scan.submissionForm.catalog.newValue")}
            >
              <Text style={styles.manualText}>
                {t("scan.submissionForm.catalog.addGrape", { value: typed })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {value.length > 0 ? (
        <View style={styles.chips}>
          {value.map((grape) => {
            const known = isKnownGrape(grape, options);
            return (
              <Pressable
                key={grape}
                onPress={() => onChange(value.filter((item) => item !== grape))}
                style={[styles.chip, !known && styles.chipProposal]}
                accessibilityRole="button"
                accessibilityLabel={t("scan.submissionForm.catalog.removeGrape", { name: grape })}
                accessibilityHint={known ? undefined : t("scan.submissionForm.catalog.newValue")}
              >
                <Text style={[styles.chipText, !known && styles.chipTextProposal]}>
                  {known ? grape : t("scan.submissionForm.catalog.proposedGrape", { name: grape })} ×
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[2] },
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: wine[600],
    backgroundColor: wine[50],
  },
  chipProposal: { borderStyle: "dashed", backgroundColor: lightTokens.surfaceDefault },
  chipText: { ...textStyles.labelMedium, color: wine[700] },
  chipTextProposal: { color: lightTokens.textSecondary },
});
