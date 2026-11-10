import type { TextInputProps } from "react-native";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { Search, SlidersHorizontal, X } from "lucide-react-native";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { radii, iconStrokes, shadowColors } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";

type SearchFilterBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  placeholder: string;
  activeFilterCount?: number;
  onFilterPress: () => void;
  isLoading?: boolean;
  filterAccessibilityLabel: string;
  clearAccessibilityLabel: string;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
};

export function SearchFilterBar({
  value,
  onChangeText,
  onClear,
  placeholder,
  activeFilterCount = 0,
  onFilterPress,
  isLoading = false,
  filterAccessibilityLabel,
  clearAccessibilityLabel,
  autoCapitalize = "none",
  autoCorrect = false,
}: SearchFilterBarProps) {
  return (
    <View style={styles.surface}>
      <View style={styles.searchIcon}>
        {isLoading ? (
          <ActivityIndicator size="small" color={vinnotColors.brand} />
        ) : (
          <Search size={20} color={vinnotColors.muted} strokeWidth={iconStrokes.regular} />
        )}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={vinnotColors.placeholder}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        spellCheck={false}
        returnKeyType="search"
        style={styles.input}
      />
      {value.length > 0 && onClear ? (
        <MotionPressable
          onPress={onClear}
          style={styles.clear}
          accessibilityRole="button"
          accessibilityLabel={clearAccessibilityLabel}
          hitSlop={8}
        >
          <X size={17} color={vinnotColors.muted} />
        </MotionPressable>
      ) : null}
      <View style={styles.divider} />
      <MotionPressable
        onPress={onFilterPress}
        style={[styles.filter, activeFilterCount > 0 && styles.filterActive]}
        accessibilityRole="button"
        accessibilityLabel={filterAccessibilityLabel}
        hitSlop={4}
      >
        <SlidersHorizontal
          size={20}
          color={activeFilterCount > 0 ? vinnotColors.white : vinnotColors.ink}
          strokeWidth={iconStrokes.regular}
        />
        {activeFilterCount > 0 ? (
          <View style={styles.count}>
            <Text style={styles.countText}>{activeFilterCount}</Text>
          </View>
        ) : null}
      </MotionPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: vinnotColors.surface,
    paddingHorizontal: 7,
    shadowColor: shadowColors.deep,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  searchIcon: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 56,
    paddingHorizontal: 2,
    paddingVertical: 0,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.ui,
    color: vinnotColors.ink,
    letterSpacing: 0,
  },
  clear: {
    width: 32,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    width: 1,
    height: 28,
    marginHorizontal: 5,
    backgroundColor: vinnotColors.border,
  },
  filter: {
    position: "relative",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.brandSoft,
  },
  filterActive: {
    backgroundColor: vinnotColors.brand,
  },
  count: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: vinnotColors.white,
    borderRadius: radii.full,
    backgroundColor: vinnotColors.brandDeep,
    paddingHorizontal: 3,
  },
  countText: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: 12,
    color: vinnotColors.white,
  },
});
