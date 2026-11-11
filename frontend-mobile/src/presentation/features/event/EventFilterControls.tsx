import { useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { ChevronDown, MapPin, Search, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { styles } from "./events.styles";

type HeroPillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: ReactNode;
};

export function HeroPill({ label, selected, onPress, icon }: HeroPillProps) {
  return (
    <MotionPressable
      onPress={onPress}
      pressedScale={0.97}
      style={[styles.heroPill, selected && styles.heroPillActive]}
    >
      {icon}
      <Text style={[styles.heroPillText, selected && styles.heroPillTextActive]}>{label}</Text>
    </MotionPressable>
  );
}

type EventFilterSelectProps = {
  label: string;
  value: string;
  open: boolean;
  onPress: () => void;
};

export function EventFilterSelect({ label, value, open, onPress }: EventFilterSelectProps) {
  return (
    <MotionPressable
      onPress={onPress}
      pressedScale={0.985}
      style={[styles.filterSelect, open && styles.filterSelectOpen]}
    >
      <View style={styles.filterSelectText}>
        {value ? <Text style={styles.filterSelectLabel}>{label}</Text> : null}
        <Text style={styles.filterSelectValue} numberOfLines={1}>
          {value || label}
        </Text>
      </View>
      <View style={styles.filterSelectIcon}>
        <ChevronDown
          size={17}
          color={vinnotColors.ink}
          style={open ? styles.chevronOpen : undefined}
        />
      </View>
    </MotionPressable>
  );
}

type EventFilterOptionsProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** Display text for an option; the value passed to `onChange` stays unchanged. */
  formatOption?: (option: string) => string;
};

const identity = (option: string) => option;

export function EventFilterOptions({
  options,
  value,
  onChange,
  searchPlaceholder,
  emptyLabel,
  formatOption = identity,
}: EventFilterOptionsProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("common.search");
  const resolvedEmptyLabel = emptyLabel ?? t("common.noOptions");
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return options;
    return options.filter(
      (option) =>
        normalizeSearch(option).includes(normalizedQuery) ||
        normalizeSearch(formatOption(option)).includes(normalizedQuery),
    );
  }, [formatOption, options, query]);

  return (
    <View style={styles.filterOptions}>
      <View style={styles.optionsSearch}>
        <Search size={16} color={vinnotColors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={resolvedSearchPlaceholder}
          placeholderTextColor={vinnotColors.placeholder}
          autoCorrect={false}
          style={styles.optionsSearchInput}
        />
        {query ? (
          <MotionPressable
            onPress={() => setQuery("")}
            pressedScale={0.92}
            style={styles.optionsSearchClear}
            accessibilityRole="button"
          >
            <X size={14} color={vinnotColors.brand} />
          </MotionPressable>
        ) : null}
      </View>
      <ScrollView
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.filterOptionsContent}
      >
        {filteredOptions.map((option) => (
          <MotionPressable
            key={option}
            onPress={() => onChange(option)}
            pressedScale={0.985}
            style={[styles.filterOption, value === option && styles.filterOptionActive]}
          >
            <Text
              style={[styles.filterOptionText, value === option && styles.filterOptionTextActive]}
            >
              {formatOption(option)}
            </Text>
          </MotionPressable>
        ))}
        {filteredOptions.length === 0 ? (
          <Text style={styles.optionsEmpty}>{resolvedEmptyLabel}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

type EventAreaSearchProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  selectedLabel?: string | null;
  selectedMeta?: string | null;
  onClear: () => void;
  isSearching: boolean;
  error?: string | null;
};

export function EventAreaSearch({
  query,
  onQueryChange,
  onSearch,
  selectedLabel,
  selectedMeta,
  onClear,
  isSearching,
  error,
}: EventAreaSearchProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.areaSearch}>
      <View>
        <Text style={styles.areaSearchLabel}>{t("events.areaSearch.title")}</Text>
        <Text style={styles.areaSearchHint}>{t("events.areaSearch.hint")}</Text>
      </View>
      <View style={styles.areaSearchRow}>
        <View style={styles.areaSearchInputWrap}>
          <MapPin size={16} color={vinnotColors.brand} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            onSubmitEditing={onSearch}
            placeholder={t("events.areaSearch.placeholder")}
            placeholderTextColor={vinnotColors.placeholder}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.areaSearchInput}
          />
        </View>
        <MotionPressable
          onPress={onSearch}
          disabled={!query.trim() || isSearching}
          pressedScale={0.96}
          style={[
            styles.areaSearchButton,
            (!query.trim() || isSearching) && styles.areaSearchButtonDisabled,
          ]}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color={vinnotColors.white} />
          ) : (
            <Search size={18} color={vinnotColors.white} />
          )}
        </MotionPressable>
      </View>
      {selectedLabel ? (
        <View style={styles.areaSearchResult}>
          <View style={styles.areaSearchResultIcon}>
            <MapPin size={17} color={vinnotColors.brand} />
          </View>
          <View style={styles.areaSearchResultCopy}>
            <Text numberOfLines={2} style={styles.areaSearchResultLabel}>
              {selectedLabel}
            </Text>
            {selectedMeta ? (
              <Text numberOfLines={1} style={styles.areaSearchResultMeta}>
                {selectedMeta}
              </Text>
            ) : null}
          </View>
          <MotionPressable
            onPress={onClear}
            pressedScale={0.92}
            style={styles.areaSearchClear}
            accessibilityRole="button"
            accessibilityLabel={t("events.areaSearch.clear")}
          >
            <X size={15} color={vinnotColors.brand} />
          </MotionPressable>
        </View>
      ) : null}
      {/* The geocoder's own text is not localized: show a translated message instead. */}
      {error ? <Text style={styles.areaSearchError}>{t("events.areaSearch.error")}</Text> : null}
    </View>
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}
