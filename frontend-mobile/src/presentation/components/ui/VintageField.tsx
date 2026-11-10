/**
 * VintageField — optional tasted-vintage combobox for reviews and cellar notes.
 * Focus opens an inline list (never a nested sheet or modal): no vintage first, then the
 * catalog vintage, then every year newest first. Typing digits filters the list, and a
 * complete year is chosen as soon as it is typed, so nobody has to scroll a century of years.
 */
import { useContext, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type TextInputInstance } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Check, ChevronDown } from "lucide-react-native";
import {
  completeVintageQuery,
  filterVintageOptions,
  vintageOptions,
  vintageQueryDigits,
} from "@/domain/wine/vintage";
import { useHaptics } from "@/presentation/hooks/ui";
import { editorial, iconStrokes, lightTokens, radii, spacing, wine } from "@/shared/theme/tokens";
import { fontFamilies, fontSizes, textStyles } from "@/shared/theme/typography";
import { SheetFieldFocusContext } from "./SheetInputContext";
import { TextField } from "./TextField";

interface VintageFieldProps {
  value: number | null;
  onChange: (year: number | null) => void;
  /** Catalog wine vintage, offered first. */
  suggestedYear?: number | null;
  disabled?: boolean;
  /** Lets a scrolling form keep the focused input above the keyboard. */
  onInputFocus?: (input: TextInputInstance | null) => void;
}

const ROW_HEIGHT = 44;
const LIST_MAX_HEIGHT = 240;

interface VintageRow {
  year: number | null;
  suggested: boolean;
}

export function VintageField({ value, onChange, suggestedYear, disabled = false, onInputFocus }: VintageFieldProps) {
  const { t } = useTranslation();
  const { selection } = useHaptics();
  const reduceMotion = useReducedMotion();
  const input = useRef<TextInputInstance | null>(null);
  const field = useRef<ComponentRef<typeof View>>(null);
  const revealInSheet = useContext(SheetFieldFocusContext);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const expanded = open && !disabled;
  const currentYear = new Date().getFullYear();
  const options = useMemo(() => vintageOptions({ suggestedYear, currentYear }), [suggestedYear, currentYear]);
  // While searching, the empty choice steps aside: the user is looking for a year.
  const rows = useMemo<VintageRow[]>(
    () => (query ? filterVintageOptions(options, query) : [{ year: null, suggested: false }, ...options]),
    [options, query],
  );
  const valueIsSuggested = value != null && options[0]?.suggested === true && options[0].year === value;
  const valueText = value == null ? t("vintage.none") : String(value);
  const searchHint = t("vintage.searchPlaceholder");

  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = reduceMotion ? Number(expanded) : withTiming(Number(expanded), { duration: 180 });
  }, [expanded, reduceMotion, turn]);
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 180}deg` }] }));

  const close = () => {
    setOpen(false);
    setQuery("");
    input.current?.blur();
  };

  const select = (year: number | null) => {
    selection();
    close();
    onChange(year);
  };

  const handleFocus = () => {
    if (disabled) return;
    setOpen(true);
    onInputFocus?.(input.current);
    // Inside a sheet, reveal the year list too, not only the input.
    revealInSheet(field.current);
  };

  const handleChangeText = (text: string) => {
    if (disabled) return;
    const digits = vintageQueryDigits(text);
    const typedYear = completeVintageQuery(digits, currentYear);
    if (typedYear != null) {
      select(typedYear);
      return;
    }
    setQuery(digits);
    setOpen(true);
  };

  const toggle = () => {
    if (disabled) return;
    if (expanded) {
      close();
      return;
    }
    setOpen(true);
    input.current?.focus();
  };

  // Centre the chosen row so the list opens where the user left it; results start at the top.
  const selectedIndex = Math.max(0, rows.findIndex((row) => row.year === value));
  const listOffset = query ? 0 : Math.max(0, selectedIndex * ROW_HEIGHT - (LIST_MAX_HEIGHT - ROW_HEIGHT) / 2);
  // The closed field shows its value as the placeholder, in text colour when there is a year.
  const placeholder = expanded ? searchHint : valueText;
  const placeholderColor = !expanded && value != null ? lightTokens.textPrimary : lightTokens.inputPlaceholder;

  return (
    <View ref={field} style={styles.container} testID="vintage-field">
      <TextField
        ref={input}
        label={t("vintage.label")}
        value={query}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        keyboardType="number-pad"
        maxLength={4}
        returnKeyType="done"
        autoCorrect={false}
        containerStyle={disabled ? styles.fieldDisabled : undefined}
        accessibilityValue={{ text: valueIsSuggested ? `${valueText}, ${t("vintage.suggested")}` : valueText }}
        accessibilityHint={searchHint}
        accessibilityState={{ expanded, disabled }}
        rightIcon={
          <View style={styles.trailing}>
            {!expanded && valueIsSuggested && <SuggestedMark text={t("vintage.suggested")} />}
            <Pressable
              testID="vintage-toggle"
              onPress={toggle}
              disabled={disabled}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t(expanded ? "vintage.hideYears" : "vintage.showYears")}
              accessibilityState={{ expanded, disabled }}
            >
              <Animated.View style={chevronStyle}>
                <ChevronDown size={18} color={expanded ? lightTokens.brandPrimary : lightTokens.textTertiary}
                  strokeWidth={iconStrokes.regular} />
              </Animated.View>
            </Pressable>
          </View>
        }
      />
      {expanded && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(160)}
          exiting={reduceMotion ? undefined : FadeOut.duration(120)}
          style={styles.panel}
        >
          <ScrollView
            // A new list (all years or search results) mounts at its own starting offset.
            key={query ? "results" : "all"}
            testID="vintage-options"
            style={styles.list}
            contentOffset={{ x: 0, y: listOffset }}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {rows.length === 0 ? (
              <View style={styles.row} accessibilityLiveRegion="polite">
                <Text style={[styles.rowText, styles.rowTextMuted]}>{t("vintage.noMatches")}</Text>
              </View>
            ) : (
              rows.map((row, index) => (
                <VintageOption
                  key={row.year ?? "none"}
                  row={row}
                  selected={row.year === value}
                  last={index === rows.length - 1}
                  onSelect={select}
                />
              ))
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

function VintageOption({ row, selected, last, onSelect }: {
  row: VintageRow;
  selected: boolean;
  last: boolean;
  onSelect: (year: number | null) => void;
}) {
  const { t } = useTranslation();
  // Pressed feedback comes from state: NativeWind drops function styles on Pressable (#332).
  const [pressed, setPressed] = useState(false);
  const accessibilityLabel = row.year == null
    ? t("vintage.none")
    : t(row.suggested ? "vintage.selectSuggested" : "vintage.select", { year: row.year });
  return (
    <Pressable
      onPress={() => onSelect(row.year)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.row, !last && styles.rowDivider, (pressed || selected) && styles.rowActive]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.rowText, row.year == null && styles.rowTextMuted, selected && styles.rowTextSelected]}>
        {row.year == null ? t("vintage.none") : row.year}
      </Text>
      {row.suggested && <SuggestedMark text={t("vintage.suggested")} />}
      <View style={styles.rowCheck}>
        {selected && <Check size={16} color={editorial.brand} strokeWidth={iconStrokes.strong} />}
      </View>
    </Pressable>
  );
}

function SuggestedMark({ text }: { text: string }) {
  return (
    <View style={styles.mark}>
      <Text style={styles.markText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same rhythm as TextField's label-to-field gap, so the list hangs off the field like a menu.
  container: { gap: 7 },
  fieldDisabled: { opacity: 0.5 },
  trailing: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  panel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceRaised,
    overflow: "hidden",
  },
  list: { maxHeight: LIST_MAX_HEIGHT },
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: 14,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: lightTokens.borderDefault },
  rowActive: { backgroundColor: lightTokens.bgMuted },
  rowText: { ...textStyles.bodyMedium, fontSize: fontSizes.base, color: lightTokens.textPrimary },
  rowTextMuted: { color: lightTokens.textSecondary },
  rowTextSelected: { color: editorial.brand, fontFamily: fontFamilies.semibold },
  rowCheck: { marginLeft: "auto", width: 16, alignItems: "center" },
  mark: {
    borderRadius: radii.full,
    backgroundColor: wine[50],
    borderWidth: 1,
    borderColor: wine[200],
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
  },
  markText: { ...textStyles.labelSmall, color: lightTokens.brandPrimary },
});
