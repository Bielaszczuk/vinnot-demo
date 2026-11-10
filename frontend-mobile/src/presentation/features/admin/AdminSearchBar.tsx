/**
 * AdminSearchBar — search + optional filter row for admin screens.
 */
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Search, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface AdminSearchBarProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  resultCount?: number;
}

export function AdminSearchBar({
  value,
  onChangeText,
  placeholder,
  resultCount,
}: AdminSearchBarProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <View style={styles.searchIcon}>
          <Search size={17} color={wine[700]} strokeWidth={2.2} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? t("common.search")}
          placeholderTextColor={lightTokens.inputPlaceholder}
          style={styles.input}
          returnKeyType="search"
          clearButtonMode="never"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {value.length > 0 && (
          <MotionPressable
            onPress={() => onChangeText("")}
            hitSlop={10}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel={t("common.clearSearch")}
          >
            <X size={16} color={lightTokens.textSecondary} />
          </MotionPressable>
        )}
      </View>
      {resultCount !== undefined && (
        <Text style={styles.count}>{t("common.resultCount", { count: resultCount })}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    backgroundColor: lightTokens.surfaceDefault,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: lightTokens.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: lightTokens.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: wine[50],
  },
  input: {
    flex: 1,
    ...textStyles.bodyMedium,
    color: lightTokens.textPrimary,
    padding: 0,
  },
  clearButton: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTokens.bgSubtle,
  },
  count: { ...textStyles.caption, color: lightTokens.textTertiary, paddingHorizontal: 4 },
});
