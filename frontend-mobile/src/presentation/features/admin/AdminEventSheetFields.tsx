import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { styles } from "./AdminEventSheet.styles";

type ChipRowProps = {
  label: string;
  options: string[];
  value: string;
  namespace: "types" | "status" | "approvalModes";
  onSelect: (v: string) => void;
};

export function ChipRow({ label, options, value, namespace, onSelect }: ChipRowProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={[styles.chip, selected && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {t(
                  namespace === "approvalModes"
                    ? `partner.approvalModes.${option}`
                    : namespace === "status"
                      ? `events.statusLabels.${option.toLowerCase()}`
                      : `events.types.${option}`,
                  { defaultValue: option },
                )}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
