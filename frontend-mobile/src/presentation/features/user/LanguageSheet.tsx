import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { Check, Languages } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import type { Language } from "@/presentation/store/ui.store";
import { lightTokens, radii, wine, iconStrokes } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface LanguageSheetProps {
  visible: boolean;
  language: Language;
  onSelect: (language: Language) => void;
  onClose: () => void;
}

const LANGUAGE_OPTIONS: readonly Language[] = ["es-AR", "en-US"];

export function LanguageSheet({ visible, language, onSelect, onClose }: LanguageSheetProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["42%"], []);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Languages size={22} color={wine[700]} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t("profile.appLanguage")}</Text>
            <Text style={styles.subtitle}>{t("profile.appLanguageDescription")}</Text>
          </View>
        </View>

        <View style={styles.options}>
          {LANGUAGE_OPTIONS.map((option, index) => {
            const selected = option === language;
            return (
              <MotionPressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={t(`profile.languages.${option}`)}
                onPress={() => onSelect(option)}
                style={[
                  styles.option,
                  index === LANGUAGE_OPTIONS.length - 1 && styles.lastOption,
                  selected && styles.selectedOption,
                ]}
              >
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, selected && styles.selectedLabel]}>
                    {t(`profile.languages.${option}`)}
                  </Text>
                  <Text style={styles.optionNativeLabel}>
                    {option === "es-AR" ? "Español" : "English"}
                  </Text>
                </View>
                <View style={[styles.radio, selected && styles.selectedRadio]}>
                  {selected && <Check size={15} color={lightTokens.textInverted} strokeWidth={iconStrokes.heavy} />}
                </View>
              </MotionPressable>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: lightTokens.surfaceDefault },
  handle: { backgroundColor: lightTokens.borderStrong },
  content: { gap: 22, paddingHorizontal: 20, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: wine[100],
    backgroundColor: wine[50],
  },
  headerText: { flex: 1, gap: 3 },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  subtitle: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  options: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.lg,
  },
  option: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  lastOption: { borderBottomWidth: 0 },
  selectedOption: { backgroundColor: wine[50] },
  optionText: { gap: 2 },
  optionLabel: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  selectedLabel: { color: wine[800] },
  optionNativeLabel: { ...textStyles.caption, color: lightTokens.textTertiary },
  radio: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: lightTokens.borderStrong,
  },
  selectedRadio: { borderColor: wine[700], backgroundColor: wine[700] },
});
