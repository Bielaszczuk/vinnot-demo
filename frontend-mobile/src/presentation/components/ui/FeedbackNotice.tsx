import { StyleSheet, Text, View } from "react-native";
import { Check, CircleAlert, Info, TriangleAlert, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { MotionPressable } from "./MotionPressable";
import { fontSizes } from "@/shared/theme/typography";
import { iconStrokes, radii } from "@/shared/theme/tokens";

export type FeedbackVariant = "success" | "error" | "warning" | "info";
const icons = { success: Check, error: CircleAlert, warning: TriangleAlert, info: Info };

/** Passive inline notice, also used by the transient notification host. */
export function FeedbackNotice({ message, variant = "info", onDismiss }: {
  message: string; variant?: FeedbackVariant; onDismiss?: () => void;
}) {
  const { t } = useTranslation();
  const Icon = icons[variant];
  const urgent = variant === "error" || variant === "warning";
  return (
    <View style={styles.notice}>
      <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Icon size={20} color={variant === "error" ? vinnotColors.brandDeep : vinnotColors.brand} strokeWidth={iconStrokes.thin} />
      </View>
      <Text style={styles.message} accessibilityRole={urgent ? "alert" : "text"}
        accessibilityLiveRegion={urgent ? "assertive" : "polite"}>{message}</Text>
      {onDismiss && <MotionPressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t("common.close")}
        pressedScale={0.9} style={styles.close}>
        <X size={17} color={vinnotColors.muted} strokeWidth={iconStrokes.thin} />
      </MotionPressable>}
    </View>
  );
}
const styles = StyleSheet.create({
  notice: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: radii["2xl"],
    borderWidth: 1, borderColor: vinnotColors.brandTint, backgroundColor: vinnotColors.surface },
  icon: { width: 36, height: 36, flexShrink: 0, borderRadius: radii.lg, backgroundColor: vinnotColors.brandSoft,
    alignItems: "center", justifyContent: "center" },
  message: { flex: 1, fontFamily: vinnotFonts.regular, fontSize: fontSizes.ui, lineHeight: 22, color: vinnotColors.ink },
  close: { width: 44, minHeight: 44, marginRight: -8, marginVertical: -4, borderRadius: radii.lg,
    alignItems: "center", justifyContent: "center" },
});
