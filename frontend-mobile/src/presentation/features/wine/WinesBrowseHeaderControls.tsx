import { useContext, useMemo, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Search, X } from "lucide-react-native";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { SheetFieldFocusContext, type SheetMeasurable } from "@/presentation/components/ui/SheetInputContext";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { styles } from "./WinesBrowseHeader.styles";
import { iconStrokes } from "@/shared/theme/tokens";

export type HeaderOption = { value: string; label: string };

type FilterSelectButtonProps = {
  label: string;
  value?: string;
  isOpen: boolean;
  onPress: () => void;
};

export function FilterSelectButton({ label, value, isOpen, onPress }: FilterSelectButtonProps) {
  const hasValue = !!value;

  return (
    <MotionPressable
      onPress={onPress}
      style={styles.selectButton}
      accessibilityRole="button"
      accessibilityLabel={hasValue ? `${label}: ${value}` : label}
    >
      <View
        style={[
          styles.selectSurface,
          isOpen && styles.selectSurfaceOpen,
          hasValue && styles.selectSurfaceActive,
        ]}
      >
        <View style={styles.selectTextStack}>
          {hasValue && (
            <Text style={styles.selectButtonLabel} numberOfLines={1}>
              {label}
            </Text>
          )}
          <Text
            style={[styles.selectButtonText, hasValue && styles.selectButtonTextActive]}
            numberOfLines={1}
          >
            {hasValue ? value : label}
          </Text>
        </View>
        <View style={styles.selectChevron}>
          <ChevronDown size={16} color={vinnotColors.ink} />
        </View>
      </View>
    </MotionPressable>
  );
}

type OptionsPanelProps = {
  options: HeaderOption[];
  value: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
};

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

export function OptionsPanel({
  options,
  value,
  onSelect,
  searchable = false,
  searchPlaceholder: searchPlaceholderProp,
  emptyLabel: emptyLabelProp,
}: OptionsPanelProps) {
  const { t } = useTranslation();
  const searchPlaceholder = searchPlaceholderProp ?? t("common.search");
  const emptyLabel = emptyLabelProp ?? t("common.noResults");
  const [search, setSearch] = useState("");
  const panelRef = useRef<SheetMeasurable | null>(null);
  const focusInSheet = useContext(SheetFieldFocusContext);
  const filteredOptions = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search);
    if (!normalizedSearch) return options;
    return options.filter((option) =>
      normalizeSearchValue(option.label).includes(normalizedSearch),
    );
  }, [options, search]);

  if (options.length === 0) return null;

  return (
    <View ref={(view) => { panelRef.current = view; }} style={styles.optionsPanel}>
      {searchable ? (
        <View style={styles.optionSearch}>
          <Search size={16} color={vinnotColors.muted} strokeWidth={iconStrokes.thin} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onFocus={() => focusInSheet(panelRef.current)}
            onBlur={() => focusInSheet(null)}
            placeholder={searchPlaceholder}
            placeholderTextColor={vinnotColors.placeholder}
            style={styles.optionSearchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search ? (
            <MotionPressable
              onPress={() => setSearch("")}
              style={styles.optionSearchClear}
              accessibilityRole="button"
              accessibilityLabel={searchPlaceholder}
            >
              <X size={15} color={vinnotColors.muted} />
            </MotionPressable>
          ) : null}
        </View>
      ) : null}
      <ScrollView
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.optionsContent}
      >
        {filteredOptions.map((option) => {
          const selected = value === option.value;
          return (
            <MotionPressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.optionItem, selected && styles.optionItemActive]}
            >
              <Text
                style={[styles.optionText, selected && styles.optionTextActive]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
              {selected ? <Check size={16} color={vinnotColors.brand} /> : null}
            </MotionPressable>
          );
        })}
        {filteredOptions.length === 0 ? (
          <Text style={styles.optionsEmpty}>{emptyLabel}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
