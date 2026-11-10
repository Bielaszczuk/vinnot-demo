import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/presentation/hooks/ui";
import { sheetStyles } from "./partnerStyles";

type PartnerEventChipRowProps = {
  label: string;
  options: string[];
  value: string;
  namespace: "types" | "statuses" | "approvalModes";
  onSelect: (value: string) => void;
};

export function PartnerEventChipRow({
  label,
  options,
  value,
  namespace,
  onSelect,
}: PartnerEventChipRowProps) {
  const { t } = useTranslation();
  const haptics = useHaptics();

  return (
    <View style={sheetStyles.block}>
      <Text style={sheetStyles.label}>{label}</Text>
      <View style={sheetStyles.chipRow}>
        {options.map((option) => {
          const selected = option === value;
          const translated = t(`partner.${namespace}.${option}`, { defaultValue: option });
          return (
            <Pressable
              key={option}
              onPress={() => {
                haptics.selection();
                onSelect(option);
              }}
              style={[sheetStyles.chip, selected && sheetStyles.chipSelected]}
              accessibilityRole="button"
              accessibilityLabel={translated}
              accessibilityState={{ selected }}
            >
              <Text style={[sheetStyles.chipText, selected && sheetStyles.chipTextSelected]}>{translated}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
