import { StyleSheet, Text, View } from "react-native";
import { Check, MessageSquareText, Wine } from "lucide-react-native";
import { WineGlassIcon } from "@/presentation/components/ui/WineGlassIcon";
import { useTranslation } from "react-i18next";
import { FilterSheet } from "@/presentation/components/ui/FilterSheet";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import { iconStrokes, radii } from "@/shared/theme/tokens";

export type CellarSegment = "all" | "rated" | "notes";

interface CellarFilterSheetProps {
  visible: boolean;
  value: CellarSegment;
  onChange: (value: CellarSegment) => void;
  onClose: () => void;
}

/** The glass is taller than wide, so it is drawn narrower to match the line icons' height. */
const GLASS_ICON_SCALE = 0.85;

/** The "rated" segment uses the same full glass that shows a rating. */
function RatedGlassIcon({ size, color }: { size: number; color: string }) {
  return <WineGlassIcon fill={1} size={size * GLASS_ICON_SCALE} color={color} />;
}

const OPTIONS = [
  { value: "all", icon: Wine },
  { value: "rated", icon: RatedGlassIcon },
  { value: "notes", icon: MessageSquareText },
] as const;

export function CellarFilterSheet({
  visible,
  value,
  onChange,
  onClose,
}: CellarFilterSheetProps) {
  const { t } = useTranslation();

  return (
    <FilterSheet
      visible={visible}
      title={t("common.filters", { defaultValue: "Filtros" })}
      activeCount={value === "all" ? 0 : 1}
      clearLabel={t("common.clear", { defaultValue: "Limpiar" })}
      onClear={() => onChange("all")}
      onClose={onClose}
    >
      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = value === option.value;

          return (
            <MotionPressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(option.value);
                onClose();
              }}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
                <Icon
                  size={20}
                  color={selected ? vinnotColors.white : vinnotColors.brand}
                />
              </View>
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {t(`cellar.segments.${option.value}`)}
              </Text>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <Check size={14} color={vinnotColors.white} strokeWidth={iconStrokes.heavy} />}
              </View>
            </MotionPressable>
          );
        })}
      </View>
    </FilterSheet>
  );
}

const styles = StyleSheet.create({
  options: { gap: 10 },
  option: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: vinnotColors.border,
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    backgroundColor: vinnotColors.surface,
  },
  optionSelected: {
    borderColor: vinnotColors.brand,
    backgroundColor: vinnotColors.brandSoft,
  },
  iconBox: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.brandSoft,
  },
  iconBoxSelected: { backgroundColor: vinnotColors.brand },
  label: {
    flex: 1,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.base,
    color: vinnotColors.ink,
  },
  labelSelected: { color: vinnotColors.brandDeep },
  radio: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: vinnotColors.borderStrong,
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.white,
  },
  radioSelected: {
    borderColor: vinnotColors.brand,
    backgroundColor: vinnotColors.brand,
  },
});
