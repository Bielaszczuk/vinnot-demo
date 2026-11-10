import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles, fontFamilies } from "@/shared/theme/typography";
import { notificationStyles } from "./notificationStyles";

/** A dropdown for long lists such as countries or regions; `null` is the "all" option. */
export function NotificationOptionPicker({
  label,
  value,
  options,
  allLabel,
  disabled,
  onSelect,
}: {
  label: string;
  value: string | null;
  options: { id: string; name: string }[];
  allLabel: string;
  disabled: boolean;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.id === value)?.name ?? allLabel;
  const choose = (id: string | null) => {
    onSelect(id);
    setOpen(false);
  };
  return (
    <View style={notificationStyles.field}>
      <Text style={notificationStyles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current}`}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen((shown) => !shown)}
        style={[styles.button, disabled && styles.disabled]}
      >
        <Text numberOfLines={1} style={styles.value}>
          {current}
        </Text>
        <ChevronDown size={16} color={wine[700]} />
      </Pressable>
      {open && !disabled && (
        <View style={styles.dropdown}>
          <ScrollView nestedScrollEnabled style={styles.list}>
            {[{ id: null, name: allLabel }, ...options].map((option) => (
              <Pressable
                key={option.id ?? "all"}
                accessibilityRole="button"
                accessibilityState={{ selected: option.id === value }}
                onPress={() => choose(option.id)}
                style={styles.option}
              >
                <Text style={[styles.optionText, option.id === value && styles.optionSelected]}>{option.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.md,
    paddingHorizontal: 13,
    backgroundColor: lightTokens.surfaceDefault,
  },
  disabled: { opacity: 0.5 },
  value: { flex: 1, ...textStyles.bodySmall, color: lightTokens.textPrimary },
  dropdown: {
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.md,
    backgroundColor: lightTokens.surfaceDefault,
    overflow: "hidden",
  },
  list: { maxHeight: 220 },
  option: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: lightTokens.bgMuted,
  },
  optionText: { ...textStyles.bodySmall, color: lightTokens.textPrimary },
  optionSelected: { color: wine[700], fontFamily: fontFamilies.semibold },
});
