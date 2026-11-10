/**
 * ChoiceChips — a short list of one-tap options. Single mode behaves as a radio group,
 * multi mode as a set of checkboxes. Values are the API codes; labels are translated.
 */
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { iconStrokes, lightTokens, radii, spacing } from "@/shared/theme/tokens";
import { fontFamilies, fontSizes, textStyles } from "@/shared/theme/typography";

export interface ChoiceOption<V extends string = string> {
  value: V;
  label: string;
}

interface BaseProps<V extends string> {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  options: readonly ChoiceOption<V>[];
  disabled?: boolean;
  testID?: string;
}

interface SingleProps<V extends string> extends BaseProps<V> {
  multiple?: false;
  value: V | null;
  onChange: (value: V) => void;
}

interface MultiProps<V extends string> extends BaseProps<V> {
  multiple: true;
  value: readonly V[];
  onChange: (value: V[]) => void;
}

export type ChoiceChipsProps<V extends string = string> = SingleProps<V> | MultiProps<V>;

export function ChoiceChips<V extends string = string>(props: ChoiceChipsProps<V>) {
  const { label, required, hint, error, options, disabled = false, testID } = props;
  const isSelected = (value: V) =>
    props.multiple ? props.value.includes(value) : props.value === value;
  const press = (value: V) => {
    if (disabled) return;
    if (props.multiple) {
      const next = props.value.includes(value)
        ? props.value.filter((item) => item !== value)
        : [...props.value, value];
      props.onChange(next);
    } else props.onChange(value);
  };
  return (
    <View style={styles.group} testID={testID}>
      {!!label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View
        style={styles.choices}
        accessibilityRole={props.multiple ? undefined : "radiogroup"}
        accessibilityLabel={label}
      >
        {options.map((option) => (
          <ChoiceChip
            key={option.value}
            label={option.label}
            multiple={!!props.multiple}
            selected={isSelected(option.value)}
            disabled={disabled}
            onPress={() => press(option.value)}
          />
        ))}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

function ChoiceChip({ label, multiple, selected, disabled, onPress }: {
  label: string;
  multiple: boolean;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  // Pressed feedback comes from state: NativeWind drops function styles on Pressable (#332).
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected, disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && styles.chipPressed,
        disabled && styles.chipDisabled,
      ]}
    >
      {multiple && selected && (
        <Check size={14} color={lightTokens.brandPrimary} strokeWidth={iconStrokes.strong} />
      )}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing[2] },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.ui,
    lineHeight: 18,
    color: lightTokens.textSecondary,
  },
  required: { color: lightTokens.danger },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1.5],
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
    borderRadius: radii["2xl"],
    borderCurve: "continuous",
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
  },
  chipSelected: { borderColor: lightTokens.brandPrimary, backgroundColor: lightTokens.brandSecondary },
  chipPressed: { backgroundColor: lightTokens.bgSubtle },
  chipDisabled: { opacity: 0.5 },
  chipText: { fontFamily: fontFamilies.medium, fontSize: fontSizes.sm, color: lightTokens.textTertiary },
  chipTextSelected: { color: lightTokens.brandPrimary },
  hint: { ...textStyles.caption, color: lightTokens.textTertiary, lineHeight: 17 },
  error: { ...textStyles.caption, color: lightTokens.danger, lineHeight: 17 },
});
