/**
 * EntityPicker — a searchable picker for catalog entities (wineries, countries, grapes…).
 * The field opens an inline panel with a search box, the results, an empty state and an
 * optional "+ Create «query»" row. Like VintageField it never opens a nested sheet: the
 * panel stays in the form's own scroll view, where the keyboard handling already works.
 *
 * Local mode filters `options` by the query; async mode (`onQueryChange`) hands the query
 * to the caller, who passes back the results and `loading`.
 */
import { useContext, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, ChevronDown, Plus, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { normalizeCatalogName } from "@/domain/wine/catalogChoice";
import { SheetFieldFocusContext } from "@/presentation/components/ui/SheetInputContext";
import { TextField } from "@/presentation/components/ui/TextField";
import { iconStrokes, lightTokens, radii, spacing } from "@/shared/theme/tokens";
import { fontFamilies, fontSizes, textStyles } from "@/shared/theme/typography";

export interface PickerOption {
  id: string;
  label: string;
  description?: string | null;
}

interface BaseProps {
  label: string;
  required?: boolean;
  /** Shown in the closed field when nothing is selected. */
  placeholder: string;
  searchPlaceholder?: string;
  options: readonly PickerOption[];
  loading?: boolean;
  /** Async mode: the caller searches with the query and passes the results as `options`. */
  onQueryChange?: (query: string) => void;
  /** Async mode: below this length the panel asks for more letters instead of "no results". */
  minQueryLength?: number;
  emptyLabel?: string;
  /** Label of the create row for the typed query, e.g. "Create winery «X»". */
  createLabel?: (query: string) => string;
  onCreate?: (query: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** False for short fixed lists: no search box, so the keyboard does not open. */
  searchable?: boolean;
  testID?: string;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: PickerOption | null;
  onChange: (option: PickerOption | null) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: readonly PickerOption[];
  onChange: (options: PickerOption[]) => void;
}

export type EntityPickerProps = SingleProps | MultiProps;

const ROW_MIN_HEIGHT = 48;
const LIST_MAX_HEIGHT = 264;

export function EntityPicker(props: EntityPickerProps) {
  const {
    label,
    required,
    placeholder,
    searchPlaceholder,
    options,
    loading = false,
    onQueryChange,
    minQueryLength = 0,
    emptyLabel,
    createLabel,
    onCreate,
    error,
    hint,
    disabled = false,
    searchable = true,
    testID,
  } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const expanded = open && !disabled;
  const revealInSheet = useContext(SheetFieldFocusContext);
  const panel = useRef<ComponentRef<typeof View>>(null);
  const queryChange = useRef(onQueryChange);
  queryChange.current = onQueryChange;

  const selectedIds = new Set(props.multiple ? props.value.map((item) => item.id) : props.value ? [props.value.id] : []);
  const normalizedQuery = normalizeCatalogName(query);
  const results = onQueryChange || !normalizedQuery
    ? options
    : options.filter((option) => normalizeCatalogName(option.label).includes(normalizedQuery));
  const trimmedQuery = query.trim();
  const known = props.multiple ? [...options, ...props.value] : options;
  const exactMatch = known.some((option) => normalizeCatalogName(option.label) === normalizedQuery);
  const showCreate = !!onCreate && !!createLabel && !!normalizedQuery && !exactMatch && !loading;
  const tooShort = !!onQueryChange && trimmedQuery.length < minQueryLength;

  const changeQuery = (value: string) => {
    setQuery(value);
    queryChange.current?.(value);
  };
  const close = () => {
    setOpen(false);
    changeQuery("");
  };
  const toggle = () => {
    if (disabled) return;
    if (expanded) close();
    else setOpen(true);
  };
  const choose = (option: PickerOption) => {
    if (props.multiple) {
      const next = selectedIds.has(option.id)
        ? props.value.filter((item) => item.id !== option.id)
        : [...props.value, option];
      props.onChange(next);
      changeQuery("");
      return;
    }
    props.onChange(option);
    close();
  };
  const create = () => {
    onCreate?.(trimmedQuery);
    close();
  };
  const remove = (option: PickerOption) => {
    if (props.multiple) props.onChange(props.value.filter((item) => item.id !== option.id));
    else props.onChange(null);
  };

  const single = props.multiple ? null : props.value;
  const fieldText = single?.label ?? placeholder;
  const accessibilityValue = props.multiple
    ? props.value.map((item) => item.label).join(", ") || placeholder
    : fieldText;

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <Pressable
        onPress={toggle}
        disabled={disabled}
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityValue={{ text: accessibilityValue }}
        accessibilityHint={[hint, error].filter(Boolean).join(". ") || undefined}
        accessibilityState={{ expanded, disabled }}
        style={[
          styles.field,
          expanded && styles.fieldOpen,
          !!error && !expanded && styles.fieldError,
          disabled && styles.fieldDisabled,
        ]}
      >
        <View style={styles.fieldCopy}>
          <Text style={[styles.fieldText, !single && styles.placeholder]} numberOfLines={1}>
            {props.multiple ? placeholder : fieldText}
          </Text>
          {!!single?.description && (
            <Text style={styles.fieldMeta} numberOfLines={1}>
              {single.description}
            </Text>
          )}
        </View>
        <ChevronDown
          size={18}
          color={expanded ? lightTokens.brandPrimary : lightTokens.textTertiary}
          strokeWidth={iconStrokes.regular}
          style={expanded ? styles.chevronOpen : undefined}
        />
      </Pressable>

      {props.multiple && props.value.length > 0 && (
        <View style={styles.tokens}>
          {props.value.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => remove(item)}
              disabled={disabled}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t("forms.picker.remove", { label: item.label })}
              style={styles.token}
            >
              <Text style={styles.tokenText}>{item.label}</Text>
              <X size={13} color={lightTokens.brandPrimary} strokeWidth={iconStrokes.strong} />
            </Pressable>
          ))}
        </View>
      )}

      {expanded && (
        <View
          ref={panel}
          style={styles.panel}
          testID={testID ? `${testID}-panel` : undefined}
          // Without a search box nothing takes focus, so reveal the list once it is laid out.
          onLayout={searchable ? undefined : () => revealInSheet(panel.current)}
        >
          {searchable && <View style={styles.search}>
            <TextField
              value={query}
              onChangeText={changeQuery}
              placeholder={searchPlaceholder ?? t("forms.picker.search")}
              accessibilityLabel={searchPlaceholder ?? t("forms.picker.search")}
              autoFocus
              // Inside a sheet, reveal the results too, not only the search box.
              onFocus={() => revealInSheet(panel.current)}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => {
                const only = results.length === 1 ? results[0] : undefined;
                if (only) choose(only);
                else if (showCreate && results.length === 0) create();
              }}
            />
          </View>}
          <ScrollView
            style={styles.list}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            testID={testID ? `${testID}-results` : undefined}
          >
            {loading ? (
              <View style={styles.stateRow} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={lightTokens.brandPrimary} />
                <Text style={styles.stateText}>{t("forms.picker.loading")}</Text>
              </View>
            ) : tooShort ? (
              <View style={styles.stateRow}>
                <Text style={styles.stateText}>{t("forms.picker.minQuery", { count: minQueryLength })}</Text>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.stateRow} accessibilityLiveRegion="polite">
                <Text style={styles.stateText}>{emptyLabel ?? t("forms.picker.noResults")}</Text>
              </View>
            ) : (
              results.map((option) => (
                <PickerRow
                  key={option.id}
                  option={option}
                  multiple={!!props.multiple}
                  selected={selectedIds.has(option.id)}
                  onPress={() => choose(option)}
                />
              ))
            )}
            {showCreate && (
              <Pressable
                onPress={create}
                accessibilityRole="button"
                accessibilityLabel={createLabel(trimmedQuery)}
                style={[styles.row, styles.createRow]}
              >
                <Plus size={16} color={lightTokens.brandPrimary} strokeWidth={iconStrokes.strong} />
                <Text style={styles.createText} numberOfLines={2}>
                  {createLabel(trimmedQuery)}
                </Text>
              </Pressable>
            )}
          </ScrollView>
          {props.multiple && (
            <Pressable onPress={close} accessibilityRole="button" style={styles.done}>
              <Text style={styles.doneText}>{t("forms.picker.done")}</Text>
            </Pressable>
          )}
        </View>
      )}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

function PickerRow({ option, multiple, selected, onPress }: {
  option: PickerOption;
  multiple: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  // Pressed feedback comes from state: NativeWind drops function styles on Pressable (#332).
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole={multiple ? "checkbox" : "button"}
      accessibilityLabel={option.label}
      accessibilityHint={option.description ?? undefined}
      accessibilityState={multiple ? { checked: selected } : { selected }}
      style={[styles.row, (pressed || selected) && styles.rowActive]}
    >
      <View style={styles.rowCopy}>
        <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={2}>
          {option.label}
        </Text>
        {!!option.description && (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {option.description}
          </Text>
        )}
      </View>
      <View style={styles.rowCheck}>
        {selected && <Check size={16} color={lightTokens.brandPrimary} strokeWidth={iconStrokes.strong} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Same rhythm as TextField's label-to-field gap.
  container: { gap: 7 },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.ui,
    lineHeight: 18,
    color: lightTokens.textSecondary,
  },
  required: { color: lightTokens.danger },
  field: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: 14,
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    borderCurve: "continuous",
    borderWidth: 1.5,
    borderColor: lightTokens.inputBorder,
    backgroundColor: lightTokens.inputBg,
  },
  fieldOpen: { borderColor: lightTokens.borderFocus },
  fieldError: { borderColor: lightTokens.danger },
  fieldDisabled: { opacity: 0.5 },
  fieldCopy: { flex: 1, gap: 1 },
  fieldText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.base,
    lineHeight: 20,
    color: lightTokens.textPrimary,
  },
  placeholder: { color: lightTokens.inputPlaceholder, fontFamily: fontFamilies.regular },
  fieldMeta: { ...textStyles.caption, color: lightTokens.textTertiary },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
  tokens: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  token: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
    paddingLeft: spacing[3],
    paddingRight: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: lightTokens.brandSecondary,
    borderWidth: 1,
    borderColor: lightTokens.brandSecondaryStrong,
  },
  tokenText: { fontFamily: fontFamilies.medium, fontSize: fontSizes.sm, color: lightTokens.brandPrimary },
  panel: {
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceRaised,
    overflow: "hidden",
  },
  search: {
    padding: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTokens.borderDefault,
  },
  list: { maxHeight: LIST_MAX_HEIGHT },
  row: {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: 14,
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTokens.borderDefault,
  },
  rowActive: { backgroundColor: lightTokens.bgMuted },
  rowCopy: { flex: 1, gap: 1 },
  rowText: { fontFamily: fontFamilies.medium, fontSize: fontSizes.base, color: lightTokens.textPrimary },
  rowTextSelected: { color: lightTokens.brandPrimary, fontFamily: fontFamilies.semibold },
  rowMeta: { ...textStyles.caption, color: lightTokens.textTertiary },
  rowCheck: { width: 16, alignItems: "center" },
  createRow: { backgroundColor: lightTokens.brandSecondary, borderBottomWidth: 0 },
  createText: { flex: 1, fontFamily: fontFamilies.semibold, fontSize: fontSizes.ui, color: lightTokens.brandPrimary },
  stateRow: {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: 14,
  },
  stateText: { ...textStyles.bodySmall, color: lightTokens.textTertiary, flexShrink: 1 },
  done: {
    alignItems: "center",
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: lightTokens.borderDefault,
  },
  doneText: { fontFamily: fontFamilies.semibold, fontSize: fontSizes.ui, color: lightTokens.brandPrimary },
  hint: { ...textStyles.caption, color: lightTokens.textTertiary, lineHeight: 17 },
  error: { ...textStyles.caption, color: lightTokens.danger, lineHeight: 17 },
});
